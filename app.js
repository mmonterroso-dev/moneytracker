'use strict';

const CATEGORIES = ['ingresos', 'fijos', 'variables', 'ahorros'];
const PEN = v => `PEN ${parseFloat(v).toFixed(2)}`;

let currentYear, currentMonth;
let editTarget = null;
let deleteUndo = null;

function periodKey() {
  return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
}

function loadData() {
  const raw = localStorage.getItem(`moneytracker-${periodKey()}`);
  return raw ? JSON.parse(raw) : { ingresos: [], fijos: [], variables: [], ahorros: [] };
}

function saveData(data) {
  localStorage.setItem(`moneytracker-${periodKey()}`, JSON.stringify(data));
}

function catTotal(entries) {
  return entries.reduce((s, e) => s + e.amount, 0);
}

function render() {
  const data = loadData();

  const tIngresos  = catTotal(data.ingresos);
  const tFijos     = catTotal(data.fijos);
  const tVariables = catTotal(data.variables);
  const tAhorros   = catTotal(data.ahorros);
  const tGastos    = tFijos + tVariables + tAhorros;
  const balance    = tIngresos - tGastos;

  document.getElementById('total-ingresos').textContent = PEN(tIngresos);
  document.getElementById('total-gastos').textContent   = PEN(tGastos);
  document.getElementById('total-balance').textContent  = PEN(balance);

  const balanceEl = document.getElementById('total-balance');
  balanceEl.style.color = balance >= 0
    ? 'var(--accent-blue)'
    : 'var(--accent-red)';

  const catTotals = { ingresos: tIngresos, fijos: tFijos, variables: tVariables, ahorros: tAhorros };

  CATEGORIES.forEach(cat => {
    document.getElementById(`cat-total-${cat}`).textContent = PEN(catTotals[cat]);
    renderList(cat, data[cat]);
  });
}

function renderList(cat, entries) {
  const list = document.getElementById(`list-${cat}`);
  list.innerHTML = '';

  if (!entries.length) {
    list.innerHTML = `<div class="empty-state">Sin entradas este mes. Agrega la primera.</div>`;
    return;
  }

  entries.forEach((entry, i) => {
    const item = document.createElement('div');
    item.className = 'entry-item';
    item.innerHTML = `
      <span class="entry-name" title="${entry.name}">${entry.name}</span>
      <span class="entry-amount">${PEN(entry.amount)}</span>
      <div class="entry-actions">
        <button class="btn-icon" data-action="edit" data-cat="${cat}" data-i="${i}" title="Editar">✎</button>
        <button class="btn-icon delete" data-action="delete" data-cat="${cat}" data-i="${i}" title="Eliminar">✕</button>
      </div>`;
    list.appendChild(item);
  });
}

function addEntry(cat) {
  const form   = document.getElementById(`form-${cat}`);
  const nameEl = form.querySelector('.input-name');
  const amtEl  = form.querySelector('.input-amount');
  const name   = nameEl.value.trim();
  const amount = parseFloat(amtEl.value);

  if (!name || isNaN(amount) || amount <= 0) return;

  const data = loadData();
  data[cat].push({ name, amount, id: Date.now() });
  saveData(data);
  nameEl.value = '';
  amtEl.value  = '';
  nameEl.focus();
  render();
}

function deleteEntry(cat, index) {
  const data    = loadData();
  const removed = data[cat].splice(index, 1)[0];
  saveData(data);
  render();

  deleteUndo = { cat, index, entry: removed };
  showToast(`"${removed.name}" eliminado`);
}

function undoDelete() {
  if (!deleteUndo) return;
  const data = loadData();
  data[deleteUndo.cat].splice(deleteUndo.index, 0, deleteUndo.entry);
  saveData(data);
  deleteUndo = null;
  render();
  hideToast();
}

let toastTimer;
function showToast(msg) {
  document.getElementById('toastMsg').textContent = msg;
  document.getElementById('deleteToast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 4000);
}
function hideToast() {
  document.getElementById('deleteToast').classList.remove('show');
}

function openEditModal(cat, index) {
  const data  = loadData();
  const entry = data[cat][index];
  editTarget  = { cat, index };
  document.getElementById('edit-name').value   = entry.name;
  document.getElementById('edit-amount').value = entry.amount;
  document.getElementById('editModal').classList.add('open');
  document.getElementById('edit-name').focus();
}

function saveEdit() {
  if (!editTarget) return;
  const name   = document.getElementById('edit-name').value.trim();
  const amount = parseFloat(document.getElementById('edit-amount').value);
  if (!name || isNaN(amount) || amount <= 0) return;

  const data = loadData();
  data[editTarget.cat][editTarget.index] = { ...data[editTarget.cat][editTarget.index], name, amount };
  saveData(data);
  closeModal();
  render();
}

function closeModal() {
  document.getElementById('editModal').classList.remove('open');
  editTarget = null;
}

function updatePeriodLabel() {
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  document.getElementById('currentPeriod').textContent = `${months[currentMonth]} ${currentYear}`;
}

function init() {
  const now = new Date();
  currentYear  = now.getFullYear();
  currentMonth = now.getMonth();

  updatePeriodLabel();
  render();

  document.getElementById('prevMonth').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    updatePeriodLabel();
    render();
  });

  document.getElementById('nextMonth').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    updatePeriodLabel();
    render();
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  CATEGORIES.forEach(cat => {
    document.getElementById(`form-${cat}`).querySelector('.btn-add').addEventListener('click', () => addEntry(cat));
    document.getElementById(`form-${cat}`).querySelector('.input-amount').addEventListener('keydown', e => {
      if (e.key === 'Enter') addEntry(cat);
    });
    document.getElementById(`form-${cat}`).querySelector('.input-name').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById(`form-${cat}`).querySelector('.input-amount').focus();
    });
  });

  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, cat, i } = btn.dataset;
    if (action === 'delete') deleteEntry(cat, parseInt(i));
    if (action === 'edit')   openEditModal(cat, parseInt(i));
  });

  document.getElementById('cancelEdit').addEventListener('click', closeModal);
  document.getElementById('saveEdit').addEventListener('click', saveEdit);
  document.getElementById('editModal').addEventListener('click', e => {
    if (e.target === document.getElementById('editModal')) closeModal();
  });
  document.getElementById('edit-amount').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveEdit();
  });
  document.getElementById('undoBtn').addEventListener('click', undoDelete);
}

document.addEventListener('DOMContentLoaded', init);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
}
