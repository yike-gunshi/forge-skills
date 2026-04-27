#!/usr/bin/env python3
"""
解析 Claude Code / Codex JSONL 会话日志，提取 token 消耗数据。

用法：
    python3 parse_tokens.py <jsonl_file>
    python3 parse_tokens.py <jsonl_file> --json

说明：
- Claude Code: 从 message.usage 读取 cache_read/cache_create/output，并按 message.id 去重。
- Codex Desktop: 从 event_msg.token_count.payload.info.total_token_usage 读取累计值，
  按累计 token 快照做差分，避免同一轮流式刷新被重复统计。
"""

import json
import sys


USAGE_KEYS = (
    "input_tokens",
    "cached_input_tokens",
    "output_tokens",
    "reasoning_output_tokens",
    "total_tokens",
)


def fmt_k(n):
    """格式化 token 数为 k 单位，如 53k、1.2M。"""
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n / 1_000:.0f}k"
    return str(n)


def as_int(value):
    """把 usage 字段安全转成 int。"""
    if value is None:
        return 0
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def iter_jsonl(filepath):
    """逐行读取 JSONL，忽略坏行。"""
    with open(filepath, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                yield line_num, json.loads(line)
            except json.JSONDecodeError:
                continue


def detect_dialect(filepath):
    """根据 JSONL 顶层结构判断来源。"""
    for _, data in iter_jsonl(filepath):
        if "payload" in data and "type" in data:
            return "codex"
        if "message" in data or data.get("data", {}).get("message"):
            return "claude"
    return "unknown"


def parse_jsonl(filepath):
    """解析 JSONL 文件，返回消息列表。"""
    dialect = detect_dialect(filepath)
    if dialect == "codex":
        return parse_codex_jsonl(filepath)
    return parse_claude_jsonl(filepath)


def parse_claude_jsonl(filepath):
    """解析 Claude Code JSONL，按 message.id 去重后返回最终 usage 快照。"""
    messages_by_id = {}

    for line_num, data in iter_jsonl(filepath):
        msg = data.get("message") or data.get("data", {}).get("message")
        if not msg:
            continue

        usage = msg.get("usage")
        if not usage:
            continue

        msg_id = msg.get("id", f"_line_{line_num}")
        timestamp = data.get("timestamp") or msg.get("timestamp") or ""
        role = msg.get("role", "unknown")
        model = msg.get("model", "unknown")

        input_tokens = as_int(usage.get("input_tokens"))
        output_tokens = as_int(usage.get("output_tokens"))
        cache_read = as_int(
            usage.get("cache_read_input_tokens", usage.get("cache_read_tokens"))
        )
        cache_create = as_int(
            usage.get(
                "cache_creation_input_tokens",
                usage.get("cache_creation_tokens"),
            )
        )

        # 去重策略：同一 message.id 保留最新的快照（时间戳最大）。
        if msg_id in messages_by_id:
            existing_ts = messages_by_id[msg_id]["timestamp"]
            if timestamp <= existing_ts:
                continue

        messages_by_id[msg_id] = {
            "dialect": "claude",
            "timestamp": timestamp,
            "role": role,
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cache_read": cache_read,
            "cache_create": cache_create,
            "cached_input_tokens": cache_read,
            "uncached_input_tokens": input_tokens,
            "reasoning_output_tokens": 0,
            "effective_input": cache_read + cache_create,
        }

    return sorted(messages_by_id.values(), key=lambda m: m["timestamp"])


def codex_usage_snapshot(usage):
    """提取 Codex total_token_usage 的稳定字段。"""
    return {key: as_int(usage.get(key)) for key in USAGE_KEYS}


def usage_delta(current, previous):
    """计算累计 usage 的非负差分。"""
    if previous is None:
        return current.copy()
    return {key: max(current.get(key, 0) - previous.get(key, 0), 0) for key in USAGE_KEYS}


def parse_codex_jsonl(filepath):
    """
    解析 Codex Desktop JSONL。

    Codex 会在 event_msg/token_count 中持续刷新累计 token。这里用 total_token_usage
    的累计快照做差分，并跳过重复快照，避免同一轮被多次计入。
    """
    messages = []
    previous_total = None
    seen_totals = set()

    for line_num, data in iter_jsonl(filepath):
        if data.get("type") != "event_msg":
            continue

        payload = data.get("payload") or {}
        if payload.get("type") != "token_count":
            continue

        info = payload.get("info")
        if not isinstance(info, dict):
            continue

        total_usage = info.get("total_token_usage")
        if not isinstance(total_usage, dict):
            continue

        current_total = codex_usage_snapshot(total_usage)
        snapshot_key = tuple(current_total[key] for key in USAGE_KEYS)
        if snapshot_key in seen_totals:
            continue
        seen_totals.add(snapshot_key)

        delta = usage_delta(current_total, previous_total)
        previous_total = current_total
        if not any(delta.values()):
            continue

        input_tokens = delta["input_tokens"]
        cached_input = delta["cached_input_tokens"]
        output_tokens = delta["output_tokens"]

        messages.append(
            {
                "dialect": "codex",
                "timestamp": data.get("timestamp") or f"_line_{line_num}",
                "role": "token_count",
                "model": info.get("model", "codex"),
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cache_read": cached_input,
                "cache_create": 0,
                "cached_input_tokens": cached_input,
                "uncached_input_tokens": max(input_tokens - cached_input, 0),
                "reasoning_output_tokens": delta["reasoning_output_tokens"],
                "effective_input": input_tokens,
                "total_tokens": delta["total_tokens"] or input_tokens + output_tokens,
            }
        )

    return sorted(messages, key=lambda m: m["timestamp"])


def compute_summary(messages):
    """计算汇总统计。"""
    dialect = messages[0].get("dialect", "unknown") if messages else "unknown"
    total_input_raw = sum(m["input_tokens"] for m in messages)
    total_output = sum(m["output_tokens"] for m in messages)
    total_cache_read = sum(m["cache_read"] for m in messages)
    total_cache_create = sum(m["cache_create"] for m in messages)
    total_effective_input = sum(m["effective_input"] for m in messages)
    total_cached_input = sum(m.get("cached_input_tokens", m["cache_read"]) for m in messages)
    total_uncached_input = sum(m.get("uncached_input_tokens", 0) for m in messages)
    total_reasoning_output = sum(m.get("reasoning_output_tokens", 0) for m in messages)

    return {
        "dialect": dialect,
        "message_count": len(messages),
        "total_input_raw": total_input_raw,
        "total_output_tokens": total_output,
        "total_cache_read": total_cache_read,
        "total_cache_create": total_cache_create,
        "total_cached_input": total_cached_input,
        "total_uncached_input": total_uncached_input,
        "total_reasoning_output_tokens": total_reasoning_output,
        "total_effective_input": total_effective_input,
        "total_all": total_effective_input + total_output,
    }


def print_timeline(messages):
    """输出时间线格式的消息列表。"""
    dialect = messages[0].get("dialect", "unknown") if messages else "unknown"
    print(f"=== 消息时间线 ({dialect}) ===")
    print(
        f"{'时间':<20} {'eff_input':>12} {'output':>10} "
        f"{'cache_rd':>10} {'cache_wr':>10} {'in/out':>14}"
    )
    print("-" * 82)

    for m in messages:
        ts = m["timestamp"][:19] if len(m["timestamp"]) >= 19 else m["timestamp"]
        in_out = f"{fmt_k(m['effective_input'])}/{fmt_k(m['output_tokens'])}"
        print(
            f"{ts:<20} {m['effective_input']:>12,} {m['output_tokens']:>10,} "
            f"{m['cache_read']:>10,} {m['cache_create']:>10,} {in_out:>14}"
        )


def print_summary(summary):
    """输出汇总统计。"""
    ei = summary["total_effective_input"]
    eo = summary["total_output_tokens"]
    dialect = summary.get("dialect", "unknown")

    print("\n=== 汇总统计 ===")
    print(f"日志格式:         {dialect}")
    print(f"消息总数:         {summary['message_count']}")

    if dialect == "codex":
        print(f"Input tokens:     {summary['total_input_raw']:>12,}")
        print(f"Cached input:     {summary['total_cached_input']:>12,}")
        print(f"Uncached input:   {summary['total_uncached_input']:>12,}")
        print(f"Output tokens:    {eo:>12,}")
        print(f"Reasoning output: {summary['total_reasoning_output_tokens']:>12,}")
        print(f"合计:             {ei + eo:>12,}  ({fmt_k(ei)}/{fmt_k(eo)})")
        print("统计方式:         Codex total_token_usage 累计快照差分")
        return

    print(f"Effective Input:  {ei:>12,}  (cache_read + cache_create)")
    print(f"Output tokens:    {eo:>12,}")
    print(f"合计:             {ei + eo:>12,}  ({fmt_k(ei)}/{fmt_k(eo)})")
    print(f"Input (raw):      {summary['total_input_raw']:>12,}  (流式占位符，仅供参考)")


def print_phase_distribution(messages):
    """按时间四等分输出各阶段的 token 分布，含 input/output 绝对值。"""
    if not messages:
        return

    total_output = sum(m["output_tokens"] for m in messages)
    total_input = sum(m["effective_input"] for m in messages)
    if total_output == 0 and total_input == 0:
        print("\ntoken 全部为 0，无法计算分布")
        return

    n = len(messages)
    quarters = [
        messages[: n // 4],
        messages[n // 4 : n // 2],
        messages[n // 2 : 3 * n // 4],
        messages[3 * n // 4 :],
    ]

    labels = ["Q1 (前期)", "Q2 (中前)", "Q3 (中后)", "Q4 (后期)"]

    total_all = total_input + total_output
    print("\n=== 时间段 Token 分布 ===")
    print(f"{'阶段':<12} {'进度条':<22} {'占比':>6}  {'input':>10}  {'output':>10}  {'in/out':>14}")
    print("-" * 82)
    for label, quarter in zip(labels, quarters):
        q_output = sum(m["output_tokens"] for m in quarter)
        q_input = sum(m["effective_input"] for m in quarter)
        q_total = q_input + q_output
        pct = (q_total / total_all * 100) if total_all > 0 else 0
        bar_len = int(pct / 5)
        bar = "█" * bar_len + "░" * (20 - bar_len)
        in_out = f"{fmt_k(q_input)}/{fmt_k(q_output)}"
        print(
            f"{label:<12} {bar} {pct:5.1f}%  {q_input:>10,}  {q_output:>10,}  {in_out:>14}"
        )


def main():
    if len(sys.argv) < 2:
        print("用法: python3 parse_tokens.py <jsonl_file>", file=sys.stderr)
        sys.exit(1)

    filepath = sys.argv[1]

    try:
        messages = parse_jsonl(filepath)
    except FileNotFoundError:
        print(f"文件不存在: {filepath}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"解析失败: {e}", file=sys.stderr)
        sys.exit(1)

    if not messages:
        print("未找到包含 usage/token_count 数据的消息")
        sys.exit(0)

    print_timeline(messages)

    summary = compute_summary(messages)
    print_summary(summary)

    print_phase_distribution(messages)

    if "--json" in sys.argv:
        output = {
            "summary": summary,
            "messages": [
                {
                    "dialect": m.get("dialect"),
                    "timestamp": m["timestamp"],
                    "effective_input": m["effective_input"],
                    "input_tokens": m["input_tokens"],
                    "output_tokens": m["output_tokens"],
                    "cache_read": m["cache_read"],
                    "cache_create": m["cache_create"],
                    "cached_input_tokens": m.get("cached_input_tokens", 0),
                    "uncached_input_tokens": m.get("uncached_input_tokens", 0),
                    "reasoning_output_tokens": m.get("reasoning_output_tokens", 0),
                }
                for m in messages
            ],
        }
        print("\n=== JSON ===")
        print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
