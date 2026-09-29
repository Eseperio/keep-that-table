import BetterMobileTable from '../dist/better-mobile-table.esm.js';

const table = document.querySelector('#directory-table');
const form = document.querySelector('#demo-settings');
const breakpointControl = document.querySelector('#mobile-breakpoint');
const customLabelsControl = document.querySelector('#custom-labels');
const useCustomItemControl = document.querySelector('#custom-item-renderer');
const useCustomDetailControl = document.querySelector('#custom-detail-renderer');
const languageControl = document.querySelector('#demo-language');
let instance;

function makeCustomItem({ title, subtitle, cells }) {
  const summary = document.createElement('span');
  summary.className = 'demo-mobile-summary';

  const status = document.createElement('span');
  const statusText = cells[3]?.text || 'Unknown';
  if (document.body.dataset.bootstrapVersion === '3') {
    status.className = `label ${statusText === 'Active' ? 'label-success' : 'label-default'}`;
  } else {
    status.className = `badge ${statusText === 'Active' ? 'text-bg-success' : 'text-bg-secondary'}`;
  }
  status.textContent = statusText;

  const heading = document.createElement('strong');
  heading.textContent = title;
  const description = document.createElement('small');
  description.textContent = `${subtitle} · ${cells[2]?.text || ''}`;
  summary.append(status, heading, description);
  return summary;
}

function makeCustomDetail({ cells }) {
  const details = document.createElement('div');
  details.className = 'list-group demo-rendered-detail';

  cells.filter((cell) => !cell.hidden).forEach((cell) => {
    const row = document.createElement('div');
    row.className = 'list-group-item';
    const label = document.createElement('strong');
    label.className = 'demo-detail-label';
    label.textContent = cell.label;
    const value = document.createElement('span');
    value.innerHTML = cell.html;
    row.append(label, value);
    details.append(row);
  });

  return details;
}

function rebuildDemo() {
  instance?.destroy();

  const customLabels = customLabelsControl.checked;
  instance = new BetterMobileTable(table, {
    mobileBreakpoint: Number(breakpointControl.value),
    truncateListText: document.querySelector('#truncate-list-text').checked,
    moveFilters: document.querySelector('#move-filters').checked,
    movePagination: document.querySelector('#move-pagination').checked,
    language: languageControl.value,
    texts: customLabels ? {
      filterButton: 'Advanced filters',
      sortButton: 'Choose order',
      backButton: 'Return to directory',
      closeButton: 'Close mobile panel',
      filterTitle: 'Refine the directory',
      sortTitle: 'Choose a sort order',
      detailTitle: 'Directory record details',
      summaryTitle: 'Directory summary',
      filterFallbackLabel: 'Filter field',
      detailAriaLabelPrefix: 'Open directory record for',
      detailRowFallback: 'record',
    } : {},
    itemRenderer: useCustomItemControl.checked ? makeCustomItem : null,
    detailRenderer: useCustomDetailControl.checked ? makeCustomDetail : null,
  });

  document.querySelector('#breakpoint-value').textContent = `${breakpointControl.value}px`;
  document.querySelector('.demo-table-shell')?.classList.toggle(
    'demo-mobile-table-active',
    window.innerWidth <= Number(breakpointControl.value),
  );
}

form.addEventListener('change', rebuildDemo);
breakpointControl.addEventListener('input', () => {
  document.querySelector('#breakpoint-value').textContent = `${breakpointControl.value}px`;
});
window.addEventListener('resize', () => {
  document.querySelector('.demo-table-shell')?.classList.toggle(
    'demo-mobile-table-active',
    window.innerWidth <= Number(breakpointControl.value),
  );
});
rebuildDemo();
