# BetterMobileTable

BetterMobileTable is a lightweight, dependency-free JavaScript library that presents an existing HTML table as a **list and detail view on mobile**. The original table remains the source of truth and is shown at desktop widths.

## Features

- Keeps your existing table markup, links, controls, and server-side behavior.
- Builds a compact mobile list and an accessible row detail view.
- Supports custom list and detail renderers, filters, sorting links, footers, and pagination.
- Does not implement client-side filtering, sorting, or pagination.

## Requirements

- A modern browser with support for ES modules, classes, `Element.append()`, and `HTMLTemplateElement`.
- A table with a `<tbody>`. A `<thead>` is recommended for column labels.

## Install

Copy the files from `dist/` to your project and include the stylesheet plus either the IIFE build or the ES module build.

### IIFE / script tag

```html
<link rel="stylesheet" href="/assets/better-mobile-table.css">
<script src="/assets/better-mobile-table.iife.js" defer></script>
<script>
  window.addEventListener('DOMContentLoaded', () => BetterMobileTable.init());
</script>
```

The IIFE build exposes `window.BetterMobileTable`.

### ES module

```html
<script type="module">
  import BetterMobileTable from '/assets/better-mobile-table.esm.js';
  BetterMobileTable.init();
</script>
```

## Quick start

Mark the table and initialize the library after it is present in the document:

```html
<table data-mobile-table>
  <thead>
    <tr><th data-mobile-title>Name</th><th>Email</th></tr>
  </thead>
  <tbody>
    <tr><td>Alex Morgan</td><td>alex@example.com</td></tr>
  </tbody>
</table>

<script type="module">
  import BetterMobileTable from './dist/better-mobile-table.esm.js';
  BetterMobileTable.init();
</script>
```

See [`examples/`](examples/) for the demo index, including Bootstrap 5 and Bootstrap 3 scenarios.

## Build the distribution

The checked-in `dist/` files are generated from `src/`. With Node.js installed, run:

```sh
npm run build
```

The build has no third-party dependencies. It copies the CSS and ES module and creates the IIFE bundle in `dist/`. Edit files in `src/`, then run the build before committing changes.

## API

```js
const instances = BetterMobileTable.init(options);

const instance = new BetterMobileTable(tableElement, options);
instance.refresh();
instance.openDetail(0);
instance.closeDetail();
instance.destroy();
```

`init()` initializes every `table[data-mobile-table]` in the document and returns the instances. The constructor accepts an `HTMLTableElement` and throws if another element type is passed. `refresh()` rebuilds the mobile representation after the table changes. Call `destroy()` to remove the generated UI and listeners.

## Options

```js
{
  mobileBreakpoint: 768,
  truncateListText: true,
  listTitleFallbackColumn: 0,
  animation: true,
  moveFilters: true,
  movePagination: false,
  itemRenderer: null,
  detailRenderer: null,
  language: 'auto',
  texts: {
    filterButton: 'Filter',
    sortButton: 'Sort by',
    backButton: 'Back to list',
    closeButton: 'Close',
    filterTitle: 'Filter by',
    sortTitle: 'Sort by',
    detailTitle: 'Viewing the selected record',
    summaryTitle: 'Summary',
    filterFallbackLabel: 'Filter',
    detailAriaLabelPrefix: 'View details for',
    detailRowFallback: 'row'
  }
}
```

English and Spanish UI labels are built in. With `language: 'auto'` (the default), the library reads the table's nearest `lang` attribute, then the document's `lang`, and finally the browser language. Regional codes such as `es-MX` and `en-GB` are supported. If the detected language is not Spanish, English is used.

Set the language explicitly when needed:

```js
BetterMobileTable.init({ language: 'es' });
BetterMobileTable.init({ language: 'en' });
```

`texts` overrides individual labels for a custom translation or another language. Any unspecified labels use the selected language's built-in strings. Set `mobileBreakpoint` to the maximum viewport width at which the mobile view should appear. The demo includes a language picker.

The English strings in the options example above show the available overrides. Omit `texts` to use the built-in strings for the selected language. The library translates its generated controls and accessibility labels; it leaves table headers, cell content, and other application-provided text as authored.

For a language without built-in strings, set `language` and provide translated values through `texts`. For example, pass the French translations for `filterButton`, `sortButton`, `backButton`, `closeButton`, `filterTitle`, `sortTitle`, `detailTitle`, `summaryTitle`, `filterFallbackLabel`, `detailAriaLabelPrefix`, and `detailRowFallback`. Custom values override the built-in dictionary, so you can also translate only selected labels.

Opening a filter or sort panel replaces its trigger button with a titled panel and a close button. Only one toolbar panel is open at a time. The detail view hides the entire list view, including its toolbar, summary, and pagination. Use the top-right close button, the bottom "Back to list" button, or Escape to return to the list. Keyboard focus returns to the selected row.

Filter controls and pagination configured to move retain their original DOM nodes and values across mobile/desktop transitions. They return to their original positions at desktop widths or when the instance is destroyed.

## Column annotations

Add optional attributes to header cells to control how columns appear in the mobile view:

```html
<th data-mobile-title>Name</th>
<th data-mobile-subtitle>Email</th>
<th data-mobile-hidden>Internal ID</th>
<th data-mobile-label="Full name">Name</th>
```

The title column is selected with `data-mobile-title`, or falls back to `listTitleFallbackColumn`. The subtitle is optional. Hidden columns are omitted from mobile details. `data-mobile-label` overrides the label used for a detail field.

## Filters, sorting, and pagination

Mark filter controls inside the table with `data-mobile-filter`, or mark a header row with `data-mobile-filter-row`:

```html
<tr data-mobile-filter-row>
  <td data-mobile-filter><input type="search" name="name" aria-label="Filter by name"></td>
</tr>
```

Sorting links can be marked directly or placed in a marked header:

```html
<a data-mobile-sort-link href="?sort=name">Name</a>
<!-- alternatively -->
<th data-mobile-sort><a href="?sort=name">Name</a></th>
```

Mark pagination navigation with `data-mobile-pagination`. Set `movePagination: true` to move it into the mobile UI; otherwise its source element is hidden while the mobile view is active.

## Footer / summary

Mark the footer or its row/cells with `data-mobile-footer`. An optional label can be supplied with `data-mobile-label`:

```html
<tfoot data-mobile-footer data-mobile-label="Totals">
  <tr><td>Customers</td><td>2</td></tr>
</tfoot>
```

## Custom list item template

Use `data-mobile-item-template` to point to a `<template>` element. Supported placeholders include `{{title}}`, `{{subtitle}}`, `{{cells.0.text}}`, and `{{cells.0.html}}`.

```html
<table data-mobile-table data-mobile-item-template="#customer-item">...</table>

<template id="customer-item">
  <div class="customer-row">
    <strong>{{title}}</strong>
    <span>{{subtitle}}</span>
    <small>{{cells.0.text}}</small>
  </div>
</template>
```

## JavaScript renderers

`itemRenderer(context)` customizes a list item; `detailRenderer(context)` customizes the detail content. Each can return an HTML string or an `HTMLElement`.

```js
new BetterMobileTable(table, {
  itemRenderer(context) {
    return `<div><strong>${context.title}</strong><span>${context.subtitle}</span></div>`;
  },
  detailRenderer(context) {
    const fields = context.cells
      .filter((cell) => !cell.hidden)
      .map((cell) => `<div><small>${cell.label}</small><div>${cell.html}</div></div>`)
      .join('');
    return `<div>${fields}</div>`;
  }
});
```

Renderer strings are inserted as HTML. Escape any untrusted values before including them in returned markup.

## Accessibility

The generated controls are real buttons, and the library supplies `aria-expanded` and `aria-controls` for expandable panels, plus labels for detail views. Keep table headers descriptive and provide accessible names for filter controls.

## Development demo

From the repository root, build the files and start a local static server:

```sh
npm run build
python3 -m http.server 8000
```

Then open [http://localhost:8000/examples/](http://localhost:8000/examples/). It links to the basic table and both themed examples.

The more complete [Bootstrap 5 demo](examples/bootstrap-5.html) and [Bootstrap 3 demo](examples/bootstrap-3.html) use their corresponding framework CSS from a CDN and include controls for the breakpoint, filter and pagination movement, list truncation, translated labels, and custom renderers. The Bootstrap 3 page uses version 3.4.1, which has reached end of life. The CDN stylesheets require an internet connection.
