import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { marked } from 'marked';
import './styles.css';

const DEPTHS = [
  { value: '了解', hint: '知道它是什么' },
  { value: '表达', hint: '会用关键词指挥 AI' },
  { value: '复现', hint: '能复述和自己做一遍' },
];

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }
  return response.json();
}

function sanitize(html) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

function formatDate(value) {
  if (!value) return '未知日期';
  return value.slice(0, 16).replace('T', ' ');
}

function countLabel(count, unit) {
  return `${count} ${unit}`;
}

function normalizeQuoteItems(items = []) {
  return items
    .map((item) => {
      if (typeof item === 'string') {
        return { quote: item, issue: '', suggestion: '' };
      }
      return {
        quote: item?.quote || item?.text || '',
        issue: item?.issue || item?.reason || '',
        suggestion: item?.suggestion || item?.better_prompt || '',
      };
    })
    .filter((item) => item.quote);
}

function StatusPill({ status, active }) {
  const label = active ? '当前' : {
    pending_selection: '待确认',
    submitted: '已提交',
    consumed: '已生成',
    failed: '失败',
  }[status] || status;
  return <span className={`status status-${status || 'unknown'} ${active ? 'status-current' : ''}`}>{label}</span>;
}

function App() {
  const [tasks, setTasks] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const path = window.location.pathname;

  async function refresh() {
    setError('');
    setLoading(true);
    try {
      const [taskData, reviewData] = await Promise.all([api('/api/tasks'), api('/api/reviews')]);
      const nextTasks = taskData.tasks || [];
      setTasks(nextTasks);
      setReviews(reviewData.reviews || []);
      setSelectedTaskId((current) => {
        if (current && nextTasks.some((task) => task.id === current)) return current;
        const active = nextTasks.find((task) => task.active) || nextTasks.find((task) => task.status === 'pending_selection');
        return active ? active.id : '';
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  if (path.startsWith('/review/')) {
    return <ReviewDetail reviewId={decodeURIComponent(path.replace('/review/', ''))} />;
  }

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) || null;

  return (
    <main className="app-shell">
      <TopBar loading={loading} onRefresh={refresh} />
      {error && <div className="inline-error">加载失败：{error}</div>}
      <section className="panel task-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">待确认事项</p>
            <h1>复盘任务队列</h1>
          </div>
          <span className="mono">{countLabel(tasks.length, '个任务')}</span>
        </div>
        {tasks.length ? (
          <TaskQueue tasks={tasks} selectedTaskId={selectedTaskId} onSelect={setSelectedTaskId} />
        ) : (
          <EmptyState text="当前没有待确认复盘。触发 forge-fupan 后，这里会出现学习地图。" />
        )}
        {selectedTask && <TaskForm key={selectedTask.id} task={selectedTask} onSubmitted={refresh} />}
      </section>
      <HistorySection reviews={reviews} />
    </main>
  );
}

function TopBar({ loading, onRefresh }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">本地知识桌面</p>
        <h1>Fupan Workbench</h1>
      </div>
      <div className="topbar-actions">
        <span className="mono">127.0.0.1</span>
        <button className="button button-secondary" onClick={onRefresh} disabled={loading}>
          刷新状态
        </button>
      </div>
    </header>
  );
}

function TaskQueue({ tasks, selectedTaskId, onSelect }) {
  return (
    <div className="task-queue">
      {tasks.map((task) => (
        <button
          className={`queue-row ${task.id === selectedTaskId ? 'queue-row-active' : ''}`}
          key={task.id}
          onClick={() => onSelect(task.id)}
        >
          <StatusPill status={task.status} active={task.active} />
          <span className="queue-title">{task.summary || task.project || task.id}</span>
          <span className="queue-project">{task.project}</span>
          <span className="mono">{formatDate(task.created_at)}</span>
        </button>
      ))}
    </div>
  );
}

function TaskForm({ task, onSubmitted }) {
  const initialTopics = useMemo(
    () =>
      (task.topics || []).map((topic) => ({
        id: topic.id,
        title: topic.title,
        selected: topic.selected !== false,
        depth: DEPTHS.some((item) => item.value === topic.depth) ? topic.depth : '表达',
      })),
    [task],
  );
  const [topics, setTopics] = useState(initialTopics);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const readOnly = task.status !== 'pending_selection';
  const selectedCount = topics.filter((topic) => topic.selected).length;
  const expressionIssueQuotes = normalizeQuoteItems(task.expression_issue_quotes || task.expression_issues || []);
  const issueQuoteSet = new Set(expressionIssueQuotes.map((item) => item.quote));
  const contextQuestions = (task.user_questions || []).filter((question) => !issueQuoteSet.has(question));
  const hasQuoteBox = expressionIssueQuotes.length > 0 || contextQuestions.length > 0;

  function updateTopic(id, patch) {
    setTopics((current) => current.map((topic) => (topic.id === id ? { ...topic, ...patch } : topic)));
  }

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    setSubmitting(true);
    try {
      await api(`/api/tasks/${encodeURIComponent(task.id)}/selection`, {
        method: 'POST',
        body: JSON.stringify({
          topics,
          feedback,
        }),
      });
      setMessage('已提交，AI 会继续读取这次选择。');
      onSubmitted();
    } catch (err) {
      setMessage(`提交失败：${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="current-task" onSubmit={submit}>
      <div className="current-task-header">
        <div>
          <p className="eyebrow">当前任务</p>
          <h2>{task.summary || '待确认复盘'}</h2>
        </div>
        <StatusPill status={task.status} active={task.active} />
      </div>
      {hasQuoteBox && (
        <div className="question-box">
          {expressionIssueQuotes.length > 0 && (
            <section className="quote-group quote-group-issue">
              <p className="small-title">表达待优化原话</p>
              <p className="quote-note">AI 从本次会话自行判断，把影响沟通效率的原话完整摘出来。</p>
              <ul className="quote-list">
                {expressionIssueQuotes.map((item, index) => (
                  <li key={`${item.quote}-${index}`}>
                    <blockquote>{item.quote}</blockquote>
                    {item.issue && <p className="quote-meta">问题：{item.issue}</p>}
                    {item.suggestion && <p className="quote-meta">下次可以说：{item.suggestion}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {contextQuestions.length > 0 && (
            <section className="quote-group">
              <p className="small-title">{expressionIssueQuotes.length ? '背景原话摘录' : '用户原话摘录'}</p>
              {contextQuestions.map((question, index) => (
                <p className="quote-line" key={`${question}-${index}`}>{question}</p>
              ))}
            </section>
          )}
        </div>
      )}
      <div className="topic-grid">
        {(task.topics || []).map((topic) => {
          const draft = topics.find((item) => item.id === topic.id) || {};
          return (
            <article className={`topic-card ${draft.selected ? 'topic-card-selected' : ''}`} key={topic.id}>
              <label className="topic-check">
                <input
                  type="checkbox"
                  checked={!!draft.selected}
                  disabled={readOnly}
                  onChange={(event) => updateTopic(topic.id, { selected: event.target.checked })}
                />
                <span>{topic.title}</span>
              </label>
              <p>{topic.plain_explanation || '这个知识点需要你确认是否要学。'}</p>
              <p className="muted">{topic.why_relevant || '它和本次复盘有关。'}</p>
              <div className="topic-card-actions">
                <div className="recommend">推荐：{topic.recommended_depth || '表达'}</div>
                <div className="segmented" aria-label={`${topic.title} 学习深度`}>
                  {DEPTHS.map((depth) => (
                    <button
                      type="button"
                      key={depth.value}
                      className={draft.depth === depth.value ? 'selected' : ''}
                      disabled={readOnly || !draft.selected}
                      title={depth.hint}
                      onClick={() => updateTopic(topic.id, { depth: depth.value })}
                    >
                      {depth.value}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <label className="feedback-label">
        <span>补充反馈</span>
        <textarea
          rows="3"
          disabled={readOnly}
          value={task.selection?.feedback || feedback}
          placeholder="例如：React 从零讲，不要假设我懂；API 限流我想学到能自己判断方案。"
          onChange={(event) => setFeedback(event.target.value)}
        />
      </label>
      {message && <div className={message.startsWith('提交失败') ? 'inline-error' : 'inline-success'}>{message}</div>}
      <div className="form-footer">
        <span className="muted">已选择 {readOnly ? task.selection?.topics?.filter((topic) => topic.selected).length || 0 : selectedCount} 个知识区</span>
        <button className="button button-primary" disabled={readOnly || submitting || selectedCount === 0} type="submit">
          {readOnly ? '已提交' : submitting ? '提交中' : '提交学习选择'}
        </button>
      </div>
    </form>
  );
}

function HistorySection({ reviews }) {
  return (
    <section className="panel history-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">历史记录</p>
          <h2>历史复盘</h2>
        </div>
        <span className="mono">{countLabel(reviews.length, '篇复盘')}</span>
      </div>
      {reviews.length ? (
        <div className="history-table">
          <div className="history-head">
            <span>日期</span>
            <span>标题</span>
            <span>项目</span>
            <span>学到的知识</span>
          </div>
          {reviews.map((review) => (
            <a className="history-row" href={`/review/${encodeURIComponent(review.id)}`} key={review.id}>
              <span className="mono">{formatDate(review.created_at)}</span>
              <strong>{review.title}</strong>
              <span>{review.project}</span>
              <span className="topic-tags">{(review.learned_topics || []).slice(0, 5).map((topic) => <em key={topic}>{topic}</em>)}</span>
            </a>
          ))}
        </div>
      ) : (
        <EmptyState text="还没有复盘记录。" />
      )}
    </section>
  );
}

function ReviewDetail({ reviewId }) {
  const [review, setReview] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/api/reviews/${encodeURIComponent(reviewId)}`)
      .then(setReview)
      .catch((err) => setError(err.message));
  }, [reviewId]);

  if (error) {
    return (
      <main className="detail-shell">
        <a className="back-link" href="/">返回工作台</a>
        <div className="inline-error">复盘读取失败：{error}</div>
      </main>
    );
  }
  if (!review) {
    return (
      <main className="detail-shell">
        <a className="back-link" href="/">返回工作台</a>
        <EmptyState text="正在读取复盘。" />
      </main>
    );
  }

  const html = sanitize(marked.parse(review.content || ''));

  return (
    <main className="detail-shell">
      <header className="detail-top">
        <a className="back-link" href="/">返回工作台</a>
        <span className="mono">{review.project} / {formatDate(review.created_at)}</span>
      </header>
      <div className="detail-layout">
        <aside className="detail-sidebar">
          <p className="eyebrow">知识地图</p>
          <h2>学到的知识</h2>
          <div className="topic-tags vertical">{(review.learned_topics || []).map((topic) => <em key={topic}>{topic}</em>)}</div>
          <p className="file-path">{review.path}</p>
        </aside>
        <article className="review-content">
          <h1>{review.title}</h1>
          {review.summary && <p className="review-summary">{review.summary}</p>}
          <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
        </article>
      </div>
    </main>
  );
}

function EmptyState({ text }) {
  return <div className="empty-state">{text}</div>;
}

createRoot(document.getElementById('root')).render(<App />);
