import type { SchemaModel, SchemaTable, SchemaEdge } from '../schema.ts';

export function renderSchemaView(
  container: HTMLElement,
  schema: SchemaModel | null,
  ok: boolean,
): void {
  container.innerHTML = '';

  if (!ok) {
    const p = document.createElement('div');
    p.className = 'placeholder';
    p.textContent = 'Conversion failed — see error above.';
    container.appendChild(p);
    return;
  }

  if (!schema || schema.tables.length === 0) {
    const p = document.createElement('div');
    p.className = 'placeholder';
    p.textContent = 'No schema available.';
    container.appendChild(p);
    return;
  }

  const section = document.createElement('div');
  section.className = 'schema-section';

  // Build a fast lookup: for a given table+column name, find the FK edge
  const fkMap = new Map<string, SchemaEdge>(); // key = `tableName.colName`
  for (const edge of schema.edges) {
    fkMap.set(`${edge.from}.${edge.via}`, edge);
  }

  // Cards
  const cardsWrap = document.createElement('div');
  cardsWrap.className = 'schema-cards';

  for (const table of schema.tables) {
    cardsWrap.appendChild(buildCard(table, fkMap));
  }
  section.appendChild(cardsWrap);

  // Edges list
  if (schema.edges.length > 0) {
    const edgesEl = buildEdgeList(schema.edges);
    section.appendChild(edgesEl);
  }

  container.appendChild(section);
}

function buildCard(
  table: SchemaTable,
  fkMap: Map<string, SchemaEdge>,
): HTMLElement {
  const card = document.createElement('div');
  card.className = 'schema-card';

  // Header
  const header = document.createElement('div');
  header.className = 'schema-card-header';

  const nameEl = document.createElement('span');
  nameEl.className = 'schema-card-name';
  nameEl.textContent = table.name;

  const badge = document.createElement('span');
  badge.className = `badge badge--${table.kind}`;
  badge.textContent = table.kind;

  header.appendChild(nameEl);
  header.appendChild(badge);
  card.appendChild(header);

  // Body — column list
  const body = document.createElement('div');
  body.className = 'schema-card-body';

  const ul = document.createElement('ul');
  ul.className = 'schema-col-list';

  for (const col of table.columns) {
    const li = document.createElement('li');

    const isPk = col === table.primaryKey;
    const fkEdge = fkMap.get(`${table.name}.${col}`);

    if (isPk) {
      const pkTag = document.createElement('span');
      pkTag.className = 'col-tag col-tag--pk';
      pkTag.textContent = 'PK';
      li.appendChild(pkTag);
    }

    if (fkEdge) {
      const fkTag = document.createElement('span');
      fkTag.className = 'col-tag col-tag--fk';
      fkTag.textContent = 'FK';
      li.appendChild(fkTag);
    }

    const colName = document.createElement('span');
    colName.className = 'col-name';
    colName.textContent = col;
    li.appendChild(colName);

    if (fkEdge) {
      const target = document.createElement('span');
      target.className = 'fk-target';
      target.textContent = `→ ${fkEdge.to}`;
      li.appendChild(target);
    }

    ul.appendChild(li);
  }

  body.appendChild(ul);
  card.appendChild(body);

  return card;
}

function buildEdgeList(edges: SchemaEdge[]): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'schema-edges';

  const header = document.createElement('div');
  header.className = 'schema-edges-header';
  header.textContent = 'Relationships';
  wrap.appendChild(header);

  const ul = document.createElement('ul');
  ul.className = 'schema-edge-list';

  for (const edge of edges) {
    const li = document.createElement('li');

    const fromEl = document.createElement('span');
    fromEl.textContent = `${edge.from}.${edge.via}`;

    const arrow = document.createElement('span');
    arrow.className = 'edge-arrow';
    arrow.textContent = '→';

    const toEl = document.createElement('span');
    toEl.textContent = `${edge.to}`;

    li.appendChild(fromEl);
    li.appendChild(arrow);
    li.appendChild(toEl);
    ul.appendChild(li);
  }

  wrap.appendChild(ul);
  return wrap;
}
