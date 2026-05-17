const container = document.getElementById('log-container');
const filterSelect = document.getElementById('execution-filter');
const clearBtn = document.getElementById('clear-btn');
const scrollBottomBtn = document.getElementById('scroll-bottom-btn');

const knownExecutionIds = new Set();
let currentFilter = 'all';

function syntaxHighlight(json) {
    if (typeof json !== 'string') {
        json = JSON.stringify(json, undefined, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\\\u[a-zA-Z0-9]{4}|\\\\[^u]|[^\\\\"])*"(\\s*:)?|\\b(true|false|null)\\b|-?\\d+(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)/g, function (match) {
        let cls = 'json-number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'json-key';
            } else {
                cls = 'json-string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
        } else if (/null/.test(match)) {
            cls = 'json-null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

// Clear button resets logs and filter selectors
clearBtn.addEventListener('click', () => {
    container.innerHTML = '';
    knownExecutionIds.clear();
    currentFilter = 'all';
    filterSelect.innerHTML = '<option value="all">All Invocations / Paths</option>';
    filterSelect.value = 'all';
});

// View filtering controller logic
filterSelect.addEventListener('change', (e) => {
    currentFilter = e.target.value;
    const rows = container.querySelectorAll('.log-row');

    rows.forEach(row => {
        const rowExecutionId = row.getAttribute('data-execution-id');
        if (currentFilter === 'all' || rowExecutionId === currentFilter) {
            row.classList.remove('hidden');
        } else {
            row.classList.add('hidden');
        }
    });
});

// Smooth scroll to bottom button click handler
scrollBottomBtn.addEventListener('click', () => {
    window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
    });
});

// Stream Processor with Smart Scroll
const evtSource = new EventSource("/stream");
evtSource.onmessage = function(event) {
    // SMART SCROLL CHECK: Check if user is already at the bottom before adding the new item
    // We use a 100px buffer to keep it user-friendly
    const isUserAtBottom = (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 100);

    const log = JSON.parse(event.data);
    const row = document.createElement('div');
    row.className = 'log-row';

    const executionId = log.payload?.labels?.executionId || '';
    const pathName = log.payload?.labels?.path || '';

    if (executionId) {
        row.setAttribute('data-execution-id', executionId);

        if (!knownExecutionIds.has(executionId)) {
            knownExecutionIds.add(executionId);
            const option = document.createElement('option');
            option.value = executionId;
            option.textContent = `${pathName || 'Global'} (${executionId})`;
            filterSelect.appendChild(option);
        }
    }

    if (currentFilter !== 'all' && executionId !== currentFilter) {
        row.classList.add('hidden');
    }

    if (log.type === 'json') {
        row.innerHTML = `
      <details>
        <summary>
          <span class="json-icon"></span>
          <span class="time">${log.time}</span>
          <span class="severity sev-${log.severity}">${log.severity}</span>
          <span class="message">${log.message}</span>
        </summary>
        <pre class="payload-box"><code>${syntaxHighlight(log.payload)}</code></pre>
      </details>
    `;
    } else {
        row.innerHTML = `
      <summary style="cursor: default;">
        <span class="no-json-icon"></span>
        <span class="time">${log.time}</span>
        <span class="severity sev-DEFAULT">SYSTEM</span>
        <span class="message">${log.message}</span>
      </summary>
    `;
    }

    container.appendChild(row);

    // Only auto-scroll if the log matches the active view and the user was already watching the bottom
    if (isUserAtBottom && (currentFilter === 'all' || executionId === currentFilter)) {
        window.scrollTo(0, document.body.scrollHeight);
    }
};