(function (global) {
const DEFAULT_OPTIONS = {
  mobileBreakpoint: 768,
  truncateListText: true,
  listTitleFallbackColumn: 0,
  animation: true,
  moveFilters: true,
  movePagination: false,
  itemRenderer: null,
  detailRenderer: null,
  texts: {
    filterButton: 'Filtrar',
    sortButton: 'Ordenar por',
    backButton: 'Volver',
    summaryTitle: 'Resumen',
    filterFallbackLabel: 'Filtro',
    detailAriaLabelPrefix: 'Ver detalle de',
    detailRowFallback: 'fila',
  },
};

function createElement(tag, className) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  return element;
}

function extractText(element) {
  return (element?.textContent || '').replace(/\s+/g, ' ').trim();
}

function applyTemplate(template, context) {
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (full, key) => {
    const path = key.trim().split('.');
    let current = context;

    for (const segment of path) {
      if (current === null || current === undefined) {
        return '';
      }
      current = current[segment];
    }

    return current === null || current === undefined ? '' : String(current);
  });
}

function toNode(result) {
  if (result instanceof HTMLElement) {
    return result;
  }

  if (typeof result === 'string') {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = result;
    if (wrapper.childElementCount === 1) {
      return wrapper.firstElementChild;
    }
    const container = document.createElement('div');
    container.append(...Array.from(wrapper.childNodes));
    return container;
  }

  return null;
}

class BetterMobileTable {
  static init(options = {}) {
    const instances = [];
    const tables = document.querySelectorAll('table[data-mobile-table]');

    tables.forEach((table) => {
      const instance = new BetterMobileTable(table, options);
      instances.push(instance);
    });

    return instances;
  }

  constructor(tableElement, options = {}) {
    if (!(tableElement instanceof HTMLTableElement)) {
      throw new Error('BetterMobileTable: tableElement must be an HTMLTableElement.');
    }

    this.table = tableElement;
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
      texts: {
        ...DEFAULT_OPTIONS.texts,
        ...(options.texts || {}),
      },
    };
    this.isMobile = false;
    this.model = null;

    this._disposables = [];
    this._movedNodes = [];
    this._filterControls = [];
    this._activeDetailIndex = null;
    this._uidCounter = 0;

    this._createRoot();
    this.refresh();

    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize, { passive: true });
    this._disposables.push(() => window.removeEventListener('resize', this._onResize));

    this._onResize();
  }

  refresh() {
    this._setSourcePaginationHidden(false);
    this._returnMovedNodes();
    this.model = this._buildModel();
    this._render();
    this._onResize();
  }

  destroy() {
    this.closeDetail();
    this._setSourcePaginationHidden(false);
    this._returnMovedNodes();

    this._disposables.forEach((dispose) => dispose());
    this._disposables = [];

    if (this.root?.parentNode) {
      this.root.parentNode.removeChild(this.root);
    }

    this.table.classList.remove('bmt-table-hidden');
  }

  openDetail(rowIndex) {
    if (!this.model || !this.model.rows[rowIndex]) {
      return;
    }

    this._activeDetailIndex = rowIndex;
    this.listPanel.hidden = true;
    this.detailPanel.hidden = false;

    this._renderDetail(this.model.rows[rowIndex], rowIndex);

    const backButton = this.detailPanel.querySelector('.bmt-back-button');
    if (backButton) {
      backButton.focus();
    }
  }

  closeDetail() {
    this._activeDetailIndex = null;

    if (this.listPanel) {
      this.listPanel.hidden = false;
    }

    if (this.detailPanel) {
      this.detailPanel.hidden = true;
      this.detailPanel.innerHTML = '';
    }
  }

  _createRoot() {
    this.root = createElement('div', 'bmt-root');
    this.root.hidden = true;

    this.toolbar = createElement('div', 'bmt-toolbar');
    this.toolbar.hidden = true;

    this.listPanel = createElement('div', 'bmt-list-panel');
    this.list = createElement('div', 'bmt-list');
    this.listPanel.appendChild(this.list);

    this.detailPanel = createElement('div', 'bmt-detail');
    this.detailPanel.hidden = true;

    this.root.append(this.toolbar, this.listPanel, this.detailPanel);
    this.table.insertAdjacentElement('afterend', this.root);
  }

  _buildModel() {
    const headerRow = this.table.tHead?.rows?.[0] || this.table.querySelector('thead tr');
    const headerElements = headerRow ? Array.from(headerRow.cells) : [];

    const headers = headerElements.map((header, index) => {
      const label = header.dataset.mobileLabel || extractText(header);
      return {
        index,
        label,
        element: header,
        isTitle: header.hasAttribute('data-mobile-title'),
        isSubtitle: header.hasAttribute('data-mobile-subtitle'),
        isHidden: header.hasAttribute('data-mobile-hidden'),
      };
    });

    const firstVisibleHeader = headers.find((header) => !header.isHidden);
    const titleHeader = headers.find((header) => header.isTitle)
      || headers[this.options.listTitleFallbackColumn]
      || firstVisibleHeader;
    const subtitleHeader = headers.find((header) => header.isSubtitle) || null;

    const bodyRows = Array.from(this.table.tBodies).flatMap((tbody) => Array.from(tbody.rows));

    const rows = bodyRows.map((row, rowIndex) => {
      const cells = Array.from(row.cells).map((cell, cellIndex) => {
        const header = headers[cellIndex] || {
          index: cellIndex,
          label: `Column ${cellIndex + 1}`,
          isHidden: false,
          element: null,
        };

        return {
          index: cellIndex,
          label: header.label,
          text: extractText(cell),
          html: cell.innerHTML,
          element: cell,
          header,
          hidden: header.isHidden,
        };
      });

      const titleCell = titleHeader ? cells[titleHeader.index] : cells.find((cell) => !cell.hidden) || null;
      const subtitleCell = subtitleHeader ? cells[subtitleHeader.index] : null;

      return {
        index: rowIndex,
        originalRow: row,
        cells,
        titleCell,
        subtitleCell,
      };
    });

    const filters = this._collectFilters(headers);
    const sortLinks = this._collectSortLinks();
    const footer = this._collectFooter(headers);
    const pagination = this._collectPagination();

    return {
      tableElement: this.table,
      headers,
      rows,
      filters,
      sortLinks,
      footer,
      pagination,
    };
  }

  _collectFilters(headers) {
    const controls = [];
    const seen = new Set();
    const row = this.table.querySelector('thead tr[data-mobile-filter-row]');

    const pushControl = (control, fallbackLabel = '') => {
      if (!control || seen.has(control)) {
        return;
      }

      seen.add(control);

      const td = control.closest('td,th');
      let label = fallbackLabel;
      if (td && td.cellIndex >= 0) {
        label = headers[td.cellIndex]?.label || label;
      }

      if (!label) {
        label = control.getAttribute('aria-label') || control.name || control.id || this.options.texts.filterFallbackLabel;
      }

      controls.push({ control, label });
    };

    if (row) {
      Array.from(row.cells).forEach((cell) => {
        Array.from(cell.querySelectorAll('input,select,textarea,[data-mobile-filter]')).forEach((control) => {
          pushControl(control);
        });
      });
    }

    this.table.querySelectorAll('[data-mobile-filter]').forEach((node) => {
      if (matchesControl(node)) {
        pushControl(node);
      } else {
        const nestedControl = node.querySelector('input,select,textarea,[data-mobile-filter]');
        pushControl(nestedControl);
      }
    });

    return controls;
  }

  _collectSortLinks() {
    const links = [];
    const seen = new Set();

    const addLink = (link) => {
      if (!link || seen.has(link)) {
        return;
      }
      seen.add(link);
      links.push(link);
    };

    this.table.querySelectorAll('a[data-mobile-sort-link]').forEach(addLink);
    this.table.querySelectorAll('th[data-mobile-sort] a[href]').forEach(addLink);

    return links;
  }

  _collectFooter(headers) {
    const scoped = [];
    const tfoot = this.table.tFoot;

    if (!tfoot) {
      return scoped;
    }

    const markedCells = tfoot.querySelectorAll('td[data-mobile-footer],th[data-mobile-footer]');
    if (markedCells.length > 0) {
      markedCells.forEach((cell) => {
        const headerLabel = headers[cell.cellIndex]?.label || '';
        scoped.push({
          label: cell.dataset.mobileLabel || headerLabel || this.options.texts.summaryTitle,
          html: cell.innerHTML,
        });
      });
      return scoped;
    }

    const markedRows = tfoot.querySelectorAll('tr[data-mobile-footer]');
    if (markedRows.length > 0) {
      markedRows.forEach((row) => {
        Array.from(row.cells).forEach((cell, index) => {
          if (headers[index]?.isHidden) {
            return;
          }
          scoped.push({
            label: headers[index]?.label || `Column ${index + 1}`,
            html: cell.innerHTML,
          });
        });
      });
      return scoped;
    }

    if (tfoot.hasAttribute('data-mobile-footer')) {
      Array.from(tfoot.rows).forEach((row) => {
        Array.from(row.cells).forEach((cell, index) => {
          if (headers[index]?.isHidden) {
            return;
          }
          scoped.push({
            label: headers[index]?.label || `Column ${index + 1}`,
            html: cell.innerHTML,
          });
        });
      });
    }

    return scoped;
  }

  _collectPagination() {
    const parent = this.table.parentElement || this.table;
    return Array.from(parent.querySelectorAll('[data-mobile-pagination]'));
  }

  _render() {
    this.toolbar.innerHTML = '';
    this.toolbar.hidden = true;
    this.list.innerHTML = '';
    this.detailPanel.innerHTML = '';

    this._renderToolbar();
    this._renderList();
    this._renderFooter();
    this._renderPagination();
  }

  _renderToolbar() {
    const hasFilters = this.model.filters.length > 0;
    const hasSortLinks = this.model.sortLinks.length > 0;

    if (!hasFilters && !hasSortLinks) {
      return;
    }

    this.toolbar.hidden = false;

    if (hasFilters) {
      const filterButton = createElement('button', 'bmt-filter-button');
      filterButton.type = 'button';
      filterButton.textContent = this.options.texts.filterButton;

      const panel = createElement('div', 'bmt-filter-panel');
      panel.hidden = true;
      panel.id = this._nextId('bmt-filter-panel');
      filterButton.setAttribute('aria-controls', panel.id);
      filterButton.setAttribute('aria-expanded', 'false');

      const form = createElement('div', 'bmt-filter-form');

      this.model.filters.forEach((entry, index) => {
        const field = createElement('div', 'bmt-field');
        const label = createElement('label', 'bmt-field-label');
        label.textContent = entry.label;
        label.htmlFor = entry.control.id || `bmt-filter-control-${index}`;

        if (!entry.control.id) {
          entry.control.id = `bmt-filter-control-${index}`;
        }

        field.append(label);

        if (this.options.moveFilters) {
          const placeholder = document.createComment('bmt-filter-placeholder');
          entry.control.parentNode?.insertBefore(placeholder, entry.control);
          this._movedNodes.push({
            node: entry.control,
            placeholder,
          });
          field.append(entry.control);
        } else {
          field.append(entry.control.cloneNode(true));
        }

        form.append(field);
      });

      panel.append(form);

      filterButton.addEventListener('click', () => {
        const next = panel.hidden;
        panel.hidden = !next;
        filterButton.setAttribute('aria-expanded', String(next));
      });

      this.toolbar.append(filterButton, panel);
    }

    if (hasSortLinks) {
      const sortButton = createElement('button', 'bmt-sort-button');
      sortButton.type = 'button';
      sortButton.textContent = this.options.texts.sortButton;

      const menu = createElement('div', 'bmt-sort-menu');
      menu.hidden = true;
      menu.id = this._nextId('bmt-sort-menu');
      sortButton.setAttribute('aria-controls', menu.id);
      sortButton.setAttribute('aria-expanded', 'false');

      this.model.sortLinks.forEach((link) => {
        const clone = link.cloneNode(true);
        clone.classList.add('bmt-sort-link');
        menu.append(clone);
      });

      sortButton.addEventListener('click', () => {
        const next = menu.hidden;
        menu.hidden = !next;
        sortButton.setAttribute('aria-expanded', String(next));
      });

      this.toolbar.append(sortButton, menu);
    }
  }

  _renderList() {
    this.model.rows.forEach((row) => {
      const context = this._buildRendererContext(row);
      let itemElement = null;

      if (typeof this.options.itemRenderer === 'function') {
        itemElement = toNode(this.options.itemRenderer(context));
      }

      if (!itemElement) {
        const templateSelector = this.table.dataset.mobileItemTemplate;
        if (templateSelector) {
          const template = document.querySelector(templateSelector);
          if (template && 'content' in template) {
            const html = applyTemplate(template.innerHTML, context);
            itemElement = toNode(html);
          }
        }
      }

      if (!itemElement) {
        itemElement = this._defaultItemRenderer(context);
      }

      const button = createElement('button', 'bmt-list-item');
      button.type = 'button';
      button.setAttribute('aria-label', `${this.options.texts.detailAriaLabelPrefix} ${context.title || `${this.options.texts.detailRowFallback} ${row.index + 1}`}`);
      button.append(itemElement);

      const chevron = createElement('span', 'bmt-chevron');
      chevron.setAttribute('aria-hidden', 'true');
      chevron.textContent = '›';
      button.append(chevron);

      button.addEventListener('click', () => this.openDetail(row.index));
      this.list.append(button);
    });
  }

  _defaultItemRenderer(context) {
    const wrapper = createElement('div', 'bmt-item-content');
    const title = createElement('div', 'bmt-item-title');
    title.textContent = context.title;

    if (!this.options.truncateListText) {
      title.classList.add('bmt-item-title-wrap');
    }

    wrapper.append(title);

    if (context.subtitle) {
      const subtitle = createElement('div', 'bmt-item-subtitle');
      subtitle.textContent = context.subtitle;
      if (!this.options.truncateListText) {
        subtitle.classList.add('bmt-item-subtitle-wrap');
      }
      wrapper.append(subtitle);
    }

    return wrapper;
  }

  _renderDetail(row, rowIndex) {
    const context = this._buildRendererContext(row);

    if (typeof this.options.detailRenderer === 'function') {
      const customNode = toNode(this.options.detailRenderer(context));
      if (customNode) {
        this.detailPanel.innerHTML = '';

        const header = createElement('div', 'bmt-detail-header');
        const backButton = createElement('button', 'bmt-back-button');
        backButton.type = 'button';
        backButton.textContent = this.options.texts.backButton;
        backButton.addEventListener('click', () => {
          this.closeDetail();
          this.list.querySelectorAll('.bmt-list-item')[rowIndex]?.focus();
        });

        const title = createElement('h3', 'bmt-detail-title');
        title.textContent = context.title;
        header.append(backButton, title);

        this.detailPanel.append(header, customNode);
        return;
      }
    }

    const header = createElement('div', 'bmt-detail-header');
    const backButton = createElement('button', 'bmt-back-button');
    backButton.type = 'button';
    backButton.textContent = this.options.texts.backButton;
    backButton.addEventListener('click', () => {
      this.closeDetail();
      this.list.querySelectorAll('.bmt-list-item')[rowIndex]?.focus();
    });

    const title = createElement('h3', 'bmt-detail-title');
    title.textContent = context.title;
    header.append(backButton, title);

    const fields = createElement('div', 'bmt-detail-fields');

    row.cells.forEach((cell) => {
      if (cell.hidden) {
        return;
      }

      const field = createElement('div', 'bmt-field');
      const label = createElement('div', 'bmt-field-label');
      label.textContent = cell.label;

      const value = createElement('div', 'bmt-field-value');
      value.innerHTML = cell.html;

      field.append(label, value);
      fields.append(field);
    });

    this.detailPanel.innerHTML = '';
    this.detailPanel.append(header, fields);
  }

  _renderFooter() {
    const existing = this.root.querySelector('.bmt-footer');
    if (existing) {
      existing.remove();
    }

    if (!this.model.footer.length) {
      return;
    }

    const footer = createElement('div', 'bmt-footer');
    footer.setAttribute('aria-label', this.options.texts.summaryTitle);

    const title = createElement('h4', 'bmt-footer-title');
    title.textContent = this.table.tFoot?.dataset.mobileLabel || this.options.texts.summaryTitle;
    footer.append(title);

    this.model.footer.forEach((entry) => {
      const field = createElement('div', 'bmt-field');
      const label = createElement('div', 'bmt-field-label');
      label.textContent = entry.label;
      const value = createElement('div', 'bmt-field-value');
      value.innerHTML = entry.html;
      field.append(label, value);
      footer.append(field);
    });

    this.root.append(footer);
  }

  _renderPagination() {
    const existing = this.root.querySelector('.bmt-pagination');
    if (existing) {
      existing.remove();
    }

    if (!this.model.pagination.length) {
      return;
    }

    const paginationContainer = createElement('div', 'bmt-pagination');

    this.model.pagination.forEach((node) => {
      if (this.options.movePagination) {
        const placeholder = document.createComment('bmt-pagination-placeholder');
        node.parentNode?.insertBefore(placeholder, node);
        this._movedNodes.push({ node, placeholder });
        paginationContainer.append(node);
      } else {
        paginationContainer.append(node.cloneNode(true));
      }
    });

    this.root.append(paginationContainer);
  }

  _buildRendererContext(row) {
    const title = row.titleCell?.text || '';
    const subtitle = row.subtitleCell?.text || '';

    const cells = row.cells.map((cell) => ({
      index: cell.index,
      label: cell.label,
      text: cell.text,
      html: cell.html,
      element: cell.element,
      header: cell.header,
      hidden: cell.hidden,
    }));

    const cellsByLabel = {};
    cells.forEach((cell) => {
      const key = (cell.label || `col${cell.index}`).toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
      if (key) {
        cellsByLabel[key] = {
          text: cell.text,
          html: cell.html,
        };
      }
    });

    return {
      table: this.table,
      row,
      rowIndex: row.index,
      title,
      subtitle,
      cells,
      originalRow: row.originalRow,
      cellsByLabel,
    };
  }

  _onResize() {
    const shouldBeMobile = window.innerWidth <= this.options.mobileBreakpoint;
    this.isMobile = shouldBeMobile;

    if (shouldBeMobile) {
      this.root.hidden = false;
      this.table.classList.add('bmt-table-hidden');
      this._setSourcePaginationHidden(true);
      if (this._activeDetailIndex === null || this._activeDetailIndex === undefined) {
        this.listPanel.hidden = false;
        this.detailPanel.hidden = true;
      }
    } else {
      this.root.hidden = true;
      this.table.classList.remove('bmt-table-hidden');
      this._setSourcePaginationHidden(false);
      this.closeDetail();
      this._returnMovedNodes();
    }
  }

  _setSourcePaginationHidden(hidden) {
    if (!this.model?.pagination) {
      return;
    }

    this.model.pagination.forEach((node) => {
      node.classList.toggle('bmt-source-hidden', hidden && !this.options.movePagination);
    });
  }

  _nextId(prefix) {
    this._uidCounter += 1;
    return `${prefix}-${this._uidCounter}`;
  }

  _returnMovedNodes() {
    this._movedNodes.forEach(({ node, placeholder }) => {
      if (placeholder?.parentNode) {
        placeholder.parentNode.insertBefore(node, placeholder);
        placeholder.parentNode.removeChild(placeholder);
      }
    });

    this._movedNodes = [];
  }
}

function matchesControl(node) {
  return node.matches('input,select,textarea');
}

if (typeof window !== 'undefined') {
  window.BetterMobileTable = BetterMobileTable;
}

global.BetterMobileTable = BetterMobileTable;
})(typeof window !== "undefined" ? window : this);
