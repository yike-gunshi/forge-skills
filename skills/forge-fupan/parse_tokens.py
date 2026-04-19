#!/usr/bin/env python3
"""
解析 Claude Code JSONL 会话日志，提取 token 消耗数据。

用法：
    python3 parse_tokens.py <jsonl_file>
    python3 parse_tokens.py <jsonl_file> --json

输出：
    1. 每条消息的 timestamp + effective_input + output_tokens
    2. 汇总统计：总 token 数、按时间段分布（含 input/output 绝对值）

Token 计算说明：
- input_tokens 字段在 JSONL 中多为 0/1（流式占位符，不可用）
- effective_input = cache_read + cache_create（真实的输入侧消耗）
- output_tokens 经 message.id 去重后可信

基于 CodePal (https://github.com/yunshu0909/CodePal) 的解析逻辑：
- 按 message.id 去重，只保留每个 message 的最终快照
"""

import json
import sys


def fmt_k(n):
    """格式化 token 数为 k 单位，如 53k、1.2M。"""
    if n >= 1_000_000:
        return f"{n / 1_000_000:.1f}M"
    if n >= 1_000:
        return f"{n / 1_000:.0f}k"
    return str(n)


def parse_jsonl(filepath):
    """解析 JSONL 文件，返回去重后的消息列表。"""
    messages_by_id = {}

    with open(filepath, "r", encoding="utf-8") as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
            except json.JSONDecodeError:
                continue

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

            input_tokens = usage.get("input_tokens", 0)
            output_tokens = usage.get("output_tokens", 0)
            cache_read = usage.get("cache_read_input_tokens", 0) or usage.get(
                "cache_read_tokens", 0
            )
            cache_create = usage.get("cache_creation_input_tokens", 0) or usage.get(
                "cache_creation_tokens", 0
            )

            # 去重策略：同一 message.id 保留最新的快照（时间戳最大）
            if msg_id in messages_by_id:
                existing_ts = messages_by_id[msg_id]["timestamp"]
                if timestamp <= existing_ts:
                    continue

            messages_by_id[msg_id] = {
                "timestamp": timestamp,
                "role": role,
                "model": model,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "cache_read": cache_read,
                "cache_create": cache_create,
                "effective_input": cache_read + cache_create,
            }

    # 按时间戳排序
    messages = sorted(messages_by_id.values(), key=lambda m: m["timestamp"])
    return messages


def compute_summary(messages):
    """计算汇总统计。"""
    total_input_raw = sum(m["input_tokens"] for m in messages)
    total_output = sum(m["output_tokens"] for m in messages)
    total_cache_read = sum(m["cache_read"] for m in messages)
    total_cache_create = sum(m["cache_create"] for m in messages)
    total_effective_input = sum(m["effective_input"] for m in messages)

    return {
        "message_count": len(messages),
        "total_input_raw": total_input_raw,
        "total_output_tokens": total_output,
        "total_cache_read": total_cache_read,
        "total_cache_create": total_cache_create,
        "total_effective_input": total_effective_input,
        "total_all": total_effective_input + total_output,
    }


def print_timeline(messages):
    """输出时间线格式的消息列表。"""
    print("=== 消息时间线 ===")
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
    print("\n=== 汇总统计 ===")
    print(f"消息总数:         {summary['message_count']}")
    print(f"Effective Input:  {ei:>12,}  (cache_read + cache_create)")
    print(f"Output tokens:    {eo:>12,}")
    print(f"合计:             {ei + eo:>12,}  ({fmt_k(ei)}/{fmt_k(eo)})")
    print(f"Input (raw):      {summary['total_input_raw']:>12,}  (⚠️ 流式占位符，仅供参考)")


def print_phase_distribution(messages):
    """按时间四等分输出各阶段的 token 分布，含 input/output 绝对值。"""
    if not messages:
        return

    total_output = sum(m["output_tokens"] for m in messages)
    total_input = sum(m["effective_input"] for m in messages)
    if total_output == 0 and total_input == 0:
        print("\n⚠️ token 全部为 0，无法计算分布")
        return

    # 按消息顺序四等分
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
        print("未找到包含 usage 数据的消息")
        sys.exit(0)

    print_timeline(messages)

    summary = compute_summary(messages)
    print_summary(summary)

    print_phase_distribution(messages)

    # 输出 JSON 格式供程序读取
    if "--json" in sys.argv:
        output = {
            "summary": summary,
            "messages": [
                {
                    "timestamp": m["timestamp"],
                    "effective_input": m["effective_input"],
                    "output_tokens": m["output_tokens"],
                    "cache_read": m["cache_read"],
                    "cache_create": m["cache_create"],
                }
                for m in messages
            ],
        }
        print("\n=== JSON ===")
        print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
