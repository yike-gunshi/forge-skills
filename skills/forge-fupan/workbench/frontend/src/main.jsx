import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { marked } from 'marked';
import './styles.css';

const DEPTHS = [
  { value: '了解', hint: '知道它是什么' },
  { value: '表达', hint: '会用关键词指挥 AI' },
  { value: '复现', hint: '能复述和自己做一遍' },
];
const SHANGHAI_TIME_ZONE = 'Asia/Shanghai';
const SHANGHAI_DATE_FORMATTER = new Intl.DateTimeFormat('zh-CN', {
  timeZone: SHANGHAI_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

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

function formatDateParts(date) {
  const parts = Object.fromEntries(SHANGHAI_DATE_FORMATTER.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

function formatDate(value) {
  if (!value) return '未知日期';
  const text = String(value).trim();
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`;

  const localWallTime = text.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
  const hasExplicitZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
  if (hasExplicitZone) {
    const date = new Date(text);
    if (!Number.isNaN(date.getTime())) return formatDateParts(date);
  }
  if (localWallTime) {
    return `${localWallTime[1]}-${localWallTime[2]}-${localWallTime[3]} ${localWallTime[4]}:${localWallTime[5]}`;
  }

  const fallback = new Date(text);
  return Number.isNaN(fallback.getTime()) ? text : formatDateParts(fallback);
}

function countLabel(count, unit) {
  return `${count} ${unit}`;
}

function escapeAttribute(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildHeadingId(title, index, counts) {
  const normalized = String(title || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
  const base = normalized || `section-${index + 1}`;
  const count = (counts.get(base) || 0) + 1;
  counts.set(base, count);
  return count === 1 ? base : `${base}-${count}`;
}

function buildHeadingItems(headings = []) {
  const counts = new Map();
  return headings
    .filter((heading) => heading.level >= 1 && heading.level <= 3)
    .map((heading, index) => ({
      ...heading,
      id: buildHeadingId(heading.title, index, counts),
    }));
}

function normalizeHeadingText(value) {
  return String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
}

function stripDuplicateTitle(content, title) {
  const match = String(content || '').match(/^\s*#\s+(.+?)\s*(?:\n|$)/);
  if (!match || normalizeHeadingText(match[1]) !== normalizeHeadingText(title)) {
    return { content: content || '', stripped: false };
  }
  return {
    content: String(content || '').slice(match[0].length).replace(/^\n+/, ''),
    stripped: true,
  };
}

function renderMarkdown(content, headingItems) {
  const renderer = new marked.Renderer();
  let headingIndex = 0;
  renderer.heading = (text, level) => {
    if (level >= 1 && level <= 3) {
      const item = headingItems[headingIndex];
      headingIndex += 1;
      const id = item?.id ? ` id="${escapeAttribute(item.id)}"` : '';
      return `<h${level}${id}>${text}</h${level}>\n`;
    }
    return `<h${level}>${text}</h${level}>\n`;
  };
  renderer.image = (href, title, text) => {
    if (!href) return '';
    const src = escapeAttribute(href);
    const alt = escapeAttribute(text || '复盘图片');
    const titleAttribute = title ? ` title="${escapeAttribute(title)}"` : '';
    return (
      `<button type="button" class="markdown-image-button" data-zoom-src="${src}" data-zoom-alt="${alt}" aria-label="放大图片：${alt}">` +
      `<img src="${src}" alt="${alt}"${titleAttribute}>` +
      '</button>'
    );
  };
  return sanitize(marked.parse(content || '', { renderer }));
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
  const [lastRefreshedAt, setLastRefreshedAt] = useState(() => new Date().toISOString());
  const path = window.location.pathname;

  async function refresh() {
    setError('');
    setLoading(true);
    try {
      const [taskData, reviewData] = await Promise.all([api('/api/tasks'), api('/api/reviews')]);
      const nextTasks = taskData.tasks || [];
      setTasks(nextTasks);
      setReviews(reviewData.reviews || []);
      setLastRefreshedAt(new Date().toISOString());
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
      <TopBar loading={loading} lastRefreshedAt={lastRefreshedAt} onRefresh={refresh} />
      {error && <div className="inline-error">加载失败：{error}</div>}
      {tasks.length > 0 && (
        <section className="panel task-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">待确认事项</p>
              <h1>复盘任务队列</h1>
            </div>
            <span className="mono">{countLabel(tasks.length, '个任务')}</span>
          </div>
          <TaskQueue tasks={tasks} selectedTaskId={selectedTaskId} onSelect={setSelectedTaskId} />
          {selectedTask && <TaskForm key={selectedTask.id} task={selectedTask} onSubmitted={refresh} />}
        </section>
      )}
      <HistorySection reviews={reviews} />
    </main>
  );
}

function TopBar({ loading, lastRefreshedAt, onRefresh }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">本地知识桌面</p>
        <h1>Fupan Workbench</h1>
      </div>
      <div className="topbar-actions">
        <span className="mono time-chip">上海时间 {formatDate(lastRefreshedAt)}</span>
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
  const [zoomImage, setZoomImage] = useState(null);

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

  const stripped = stripDuplicateTitle(review.content || '', review.title);
  const visibleHeadings = stripped.stripped ? (review.headings || []).slice(1) : review.headings || [];
  const headingItems = buildHeadingItems(visibleHeadings);
  const tocItems = headingItems.filter((heading) => heading.level >= 2 && heading.level <= 3);
  const html = renderMarkdown(stripped.content, headingItems);

  function handleMarkdownClick(event) {
    const button = event.target.closest('button[data-zoom-src]');
    if (!button || !event.currentTarget.contains(button)) return;
    setZoomImage({
      src: button.dataset.zoomSrc,
      alt: button.dataset.zoomAlt || '复盘图片',
    });
  }

  return (
    <main className="detail-shell">
      <header className="detail-top">
        <a className="back-link" href="/">返回工作台</a>
        <span className="mono">{review.project} / {formatDate(review.created_at)}</span>
      </header>
      <div className="detail-layout">
        <aside className="detail-sidebar">
          <section className="sidebar-section">
            <p className="eyebrow">快速定位</p>
            <h2>本篇目录</h2>
            <ReviewToc items={tocItems} />
          </section>
          <section className="sidebar-section">
            <p className="eyebrow">知识地图</p>
            <h2>学到的知识</h2>
            <KnowledgeMap topics={review.learned_topics || []} />
          </section>
          <details className="source-details">
            <summary>源文件</summary>
            <p className="file-path">{review.path}</p>
          </details>
        </aside>
        <article className="review-content">
          <h1>{review.title}</h1>
          {review.summary && <p className="review-summary">{review.summary}</p>}
          <div className="markdown-body" onClick={handleMarkdownClick} dangerouslySetInnerHTML={{ __html: html }} />
        </article>
      </div>
      {zoomImage && <ImageLightbox image={zoomImage} onClose={() => setZoomImage(null)} />}
    </main>
  );
}

function KnowledgeMap({ topics }) {
  if (!topics.length) {
    return <p className="toc-empty">这篇复盘没有提取知识标签。</p>;
  }
  return (
    <div className="knowledge-map" aria-label={`学到的知识，${topics.length} 个`}>
      <div className="knowledge-map-summary">
        <span>学习路线</span>
        <strong>{topics.length} 个</strong>
      </div>
      <ol className="knowledge-list">
        {topics.map((topic, index) => (
          <li key={`${topic}-${index}`}>
            <span className="knowledge-index">{index + 1}</span>
            <span className="knowledge-label">{topic}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ImageLightbox({ image, onClose }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="image-lightbox" role="dialog" aria-modal="true" aria-label="放大图片" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <button className="image-lightbox-close" type="button" onClick={onClose}>
        关闭
      </button>
      <figure>
        <img src={image.src} alt={image.alt} />
        {image.alt && <figcaption>{image.alt}</figcaption>}
      </figure>
    </div>
  );
}

function ReviewToc({ items }) {
  if (!items.length) {
    return <p className="toc-empty">这篇复盘没有可用目录。</p>;
  }
  return (
    <nav className="toc-list" aria-label="本篇目录">
      {items.map((item) => (
        <a className={`toc-link toc-level-${item.level}`} href={`#${encodeURIComponent(item.id)}`} key={`${item.id}-${item.title}`}>
          {item.title}
        </a>
      ))}
    </nav>
  );
}

function EmptyState({ text }) {
  return <div className="empty-state">{text}</div>;
}

createRoot(document.getElementById('root')).render(<App />);
