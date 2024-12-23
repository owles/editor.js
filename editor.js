class Editor {
  constructor(selector, options = {}) {
    const defaultOptions = {
      containerClass: ''
    };
    this.options = { ...defaultOptions, ...options };
    this.textareas = Array.from(document.querySelectorAll(selector));

    this.injectStyles();
    this.createFloatingToolbar();
    this.instances = [];
    this.initEditors();
    this.addGlobalListeners();
  }

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
          .floating-toolbar {
            position: absolute;
            display: none;
            background: #000000;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            border-radius: 4px;
            padding: 5px;
            z-index: 9999;
          }
          .floating-toolbar button {
            border: none;
            background: none;
            cursor: pointer;
            padding: 5px;
            margin: 0 2px;
            font-weight: bold;
            color: #FFFFFF;
            outline: none;
          }
          .floating-toolbar button:hover {
            color: #ffb200;
          }
        `;
    document.head.appendChild(style);
  }

  createFloatingToolbar() {
    this.toolbar = document.createElement('div');
    this.toolbar.classList.add('floating-toolbar');
    this.toolbar.innerHTML = `
          <button data-cmd="bold"><strong>B</strong></button>
          <button data-cmd="italic"><em>I</em></button>
          <button data-cmd="underline"><u>U</u></button>
          <button data-cmd="link">Link</button>
        `;
    document.body.appendChild(this.toolbar);

    this.toolbar.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      const cmd = btn.getAttribute('data-cmd');
      if (cmd === 'link') {
        this.applyLink();
      } else {
        this.applyFormat(cmd);
      }

      this.updateActiveEditor();
      this.showOrHideToolbar();
    });
  }

  initEditors() {
    this.textareas.forEach(textarea => {
      const container = document.createElement('div');
      container.className = this.options.containerClass;

      container.contentEditable = 'true';
      container.innerHTML = textarea.value;
      textarea.style.display = 'none';

      container.addEventListener('input', () => {
        textarea.value = container.innerHTML;
      });

      textarea.parentNode.insertBefore(container, textarea);

      this.instances.push({ textarea, container });
    });
  }

  addGlobalListeners() {
    document.addEventListener('mouseup', () => this.showOrHideToolbar());
    document.addEventListener('keyup', () => this.showOrHideToolbar());
    document.addEventListener('mousedown', (e) => {
      if (!this.toolbar.contains(e.target)) {
        setTimeout(() => this.showOrHideToolbar(), 0);
      }
    });
  }

  showOrHideToolbar() {
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.isCollapsed) {
      this.toolbar.style.display = 'none';
      return;
    }

    let foundEditor = null;
    this.instances.forEach(instance => {
      if (instance.container.contains(selection.anchorNode)) {
        foundEditor = instance;
      }
    });

    if (!foundEditor) {
      this.toolbar.style.display = 'none';
      return;
    }

    this.currentInstance = foundEditor;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      this.toolbar.style.display = 'none';
      return;
    }

    this.toolbar.style.display = 'block';
    const toolbarWidth = this.toolbar.offsetWidth;
    const toolbarHeight = this.toolbar.offsetHeight;

    let top = rect.top + window.scrollY - toolbarHeight - 8;
    let left = rect.left + window.scrollX + (rect.width / 2) - (toolbarWidth / 2);

    const maxLeft = window.innerWidth + window.scrollX - toolbarWidth - 8;
    if (left < 8) left = 8;
    else if (left > maxLeft) left = maxLeft;

    if (top < window.scrollY + 8) {
      top = rect.bottom + window.scrollY + 8;
    }

    this.toolbar.style.top = top + 'px';
    this.toolbar.style.left = left + 'px';
  }

  applyFormat(cmd) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;

    const range = sel.getRangeAt(0);

    document.execCommand(cmd, false, null);

    if (!range.collapsed) {
      const newSel = window.getSelection();
      if (!newSel.rangeCount) return;

      const newRange = newSel.getRangeAt(0);
      const space = document.createTextNode('\u200B');
      newRange.insertNode(space);

      newRange.setStartAfter(space);
      newRange.collapse(true);

      newSel.removeAllRanges();
      newSel.addRange(newRange);
    }
  }

  applyLink() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;

    const range = sel.getRangeAt(0);

    let parentLink = this.getParentTag(sel.focusNode, 'A');
    if (parentLink) {
      document.execCommand('unlink', false, null);
      return;
    }

    const url = prompt('Enter URL:');
    if (!url) return;

    document.execCommand('createLink', false, url);

    if (!range.collapsed) {
      const newSel = window.getSelection();
      if (!newSel.rangeCount) return;

      const newRange = newSel.getRangeAt(0);
      const space = document.createTextNode('\u200B');
      newRange.insertNode(space);

      newRange.setStartAfter(space);
      newRange.collapse(true);

      newSel.removeAllRanges();
      newSel.addRange(newRange);
    }
  }

  getParentTag(node, tagName) {
    while (node) {
      if (node.nodeName === tagName) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  updateActiveEditor() {
    if (!this.currentInstance) return;
    const { textarea, container } = this.currentInstance;
    textarea.value = container.innerHTML;
  }
}
