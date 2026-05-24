# BetterMobileTable (keep-that-table)

Librería JavaScript ligera para mostrar tablas HTML existentes como **lista + detalle** en móvil, sin reemplazar el grid original ni añadir dependencias obligatorias.

## Instalación rápida

```html
<link rel="stylesheet" href="./dist/better-mobile-table.css" />
<script src="./dist/better-mobile-table.iife.js"></script>
```

O como módulo:

```js
import BetterMobileTable from './dist/better-mobile-table.esm.js';
```

## Uso mínimo

```html
<table data-mobile-table>
  ...
</table>

<script>
  BetterMobileTable.init();
</script>
```

## API pública

```js
BetterMobileTable.init(options);

const instance = new BetterMobileTable(tableElement, options);
instance.refresh();
instance.openDetail(0);
instance.closeDetail();
instance.destroy();
```

## Opciones

```js
{
  mobileBreakpoint: 768,
  truncateListText: true,
  listTitleFallbackColumn: 0,
  animation: true,
  moveFilters: true,
  movePagination: false,
  itemRenderer: null,
  detailRenderer: null
}
```

## Configuración de columnas

```html
<th data-mobile-title>Nombre</th>
<th data-mobile-subtitle>Email</th>
<th data-mobile-hidden>ID interno</th>
<th data-mobile-label="Nombre completo">Nombre</th>
```

## Filtros (GridView/Yii2 u otros)

```html
<tr data-mobile-filter-row>
  <td data-mobile-filter><input type="text" name="name"></td>
</tr>
```

También soporta controles con `data-mobile-filter` directamente.

## Ordenación

```html
<a data-mobile-sort-link href="?sort=name">Nombre</a>
```

Opcional:

```html
<th data-mobile-sort><a href="?sort=name">Nombre</a></th>
```

## Paginación

```html
<nav data-mobile-pagination>...</nav>
```

## Footer / resumen

```html
<tfoot data-mobile-footer data-mobile-label="Totales">...</tfoot>
```

También soporta `tr[data-mobile-footer]` y `td/th[data-mobile-footer]`.

## Template de item compacto

```html
<table data-mobile-table data-mobile-item-template="#client-mobile-item">...</table>

<template id="client-mobile-item">
  <div class="custom-mobile-row">
    <strong>{{title}}</strong>
    <span>{{subtitle}}</span>
    <small>{{cells.0.text}}</small>
  </div>
</template>
```

Placeholders mínimos soportados: `{{title}}`, `{{subtitle}}`, `{{cells.0.text}}`, `{{cells.0.html}}`.

## Renderizadores JavaScript

```js
new BetterMobileTable(table, {
  itemRenderer(context) {
    return `<div><strong>${context.title}</strong><span>${context.subtitle}</span></div>`;
  },
  detailRenderer(context) {
    const html = context.cells
      .filter((c) => !c.hidden)
      .map((c) => `<div><small>${c.label}</small><div>${c.html}</div></div>`)
      .join('');
    return `<div>${html}</div>`;
  },
});
```

## Accesibilidad

La UI móvil generada usa botones reales para interacción, `aria-expanded`/`aria-controls` para paneles desplegables y labels claros en la vista de detalle. El HTML original de las celdas se reutiliza sin reescritura.

## Filosofía

- Desktop: tabla original.
- Mobile: representación visual alternativa (lista + detalle).
- Sin DataGrid cliente: no implementa filtrado, ordenación ni paginación del lado cliente.
