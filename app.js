/* Relay prototype — interactions */
(function () {
  'use strict';

  // ---------- lucide ----------
  const renderIcons = () => {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  };
  document.addEventListener('DOMContentLoaded', renderIcons);

  // ---------- task interactions ----------
  document.addEventListener('click', (e) => {
    // toggle checkbox
    const check = e.target.closest('.check');
    if (check) {
      const row = check.closest('.row');
      toggleTask(row);
      return;
    }

    // toggle chevron / expand row
    const chev = e.target.closest('.chev');
    if (chev) {
      const row = chev.closest('.row');
      if (row && !row.classList.contains('done')) {
        row.classList.toggle('open');
      }
      return;
    }

    // open sheet
    const opener = e.target.closest('[data-open-sheet]');
    if (opener) {
      openSheet(opener.dataset.openSheet);
      return;
    }

    // dismiss sheet via overlay
    if (e.target.id === 'sheet-overlay') {
      closeSheet();
      return;
    }

    // sheet tab switch
    const sheetTab = e.target.closest('.sheet-tab');
    if (sheetTab) {
      switchSheetTab(sheetTab.dataset.sheetTab);
      return;
    }

    // chip select
    const chip = e.target.closest('.chip');
    if (chip) {
      selectCategory(chip.dataset.cat);
      return;
    }

    // pick row toggle (single-select per category — common list allows multi)
    const pick = e.target.closest('.pick-row');
    if (pick) {
      pick.classList.toggle('selected');
      updateSubmitState();
      return;
    }
  });

  // ---------- task move/strike ----------
  function toggleTask(row) {
    if (!row) return;
    const wasDone = row.classList.contains('done');
    row.classList.add('removing');

    setTimeout(() => {
      row.classList.remove('removing');
      row.classList.toggle('done', !wasDone);

      const activeList = document.getElementById('task-list');
      const doneList = document.getElementById('task-list-done');
      if (!activeList || !doneList) {
        updateTaskCount();
        return;
      }

      // also move the row-detail companion if present
      let detail = row.nextElementSibling;
      const hasDetail = detail && detail.classList && detail.classList.contains('row-detail');

      if (!wasDone) {
        // moving to done — collapse first
        row.classList.remove('open');
        doneList.appendChild(row);
        if (hasDetail) doneList.appendChild(detail);
      } else {
        activeList.appendChild(row);
        if (hasDetail) activeList.appendChild(detail);
      }
      updateTaskCount();
    }, 180);
  }

  function updateTaskCount() {
    const el = document.getElementById('task-count');
    if (!el) return;
    const list = document.getElementById('task-list');
    if (!list) return;
    const remaining = list.querySelectorAll('.row:not(.done)').length;
    el.textContent = remaining;
    const meta = el.parentElement;
    if (meta) meta.firstChild && (meta.innerHTML = `<span id="task-count">${remaining}</span> unfinished tasks`);
  }

  // ---------- sheet ----------
  const sheet = document.getElementById('sheet');
  const overlay = document.getElementById('sheet-overlay');
  const sheetHandle = document.getElementById('sheet-handle');

  function openSheet(which) {
    if (!sheet || !overlay) return;
    overlay.classList.add('open');
    sheet.classList.add('open');
    switchSheetTab(which || 'task');
    document.body.style.overflow = 'hidden';
  }

  function closeSheet() {
    if (!sheet || !overlay) return;
    sheet.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    // reset selections
    sheet.querySelectorAll('.pick-row.selected').forEach((el) => el.classList.remove('selected'));
    sheet.querySelectorAll('.chip.active').forEach((el) => el.classList.remove('active'));
    sheet.querySelectorAll('[data-cat-list]').forEach((el) => el.classList.add('hidden'));
    const title = sheet.querySelector('#other-title');
    const details = sheet.querySelector('#other-details');
    const noteText = sheet.querySelector('#note-text');
    const reportText = sheet.querySelector('#report-text');
    [title, details, noteText, reportText].forEach((el) => el && (el.value = ''));
    updateSubmitState();
  }

  function switchSheetTab(name) {
    document.querySelectorAll('.sheet-tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.sheetTab === name);
    });
    document.querySelectorAll('[data-sheet-panel]').forEach((p) => {
      p.classList.toggle('hidden', p.dataset.sheetPanel !== name);
    });
    const label = document.getElementById('sheet-submit-label');
    if (label) {
      label.textContent =
        name === 'task' ? 'Add to handover' :
        name === 'note' ? 'Save note' : 'Save report';
    }
    updateSubmitState();
  }

  function selectCategory(cat) {
    document.querySelectorAll('.chip').forEach((c) => {
      c.classList.toggle('active', c.dataset.cat === cat);
    });
    document.querySelectorAll('[data-cat-list]').forEach((list) => {
      list.classList.toggle('hidden', list.dataset.catList !== cat);
    });
    updateSubmitState();
  }

  // ---------- submit state ----------
  function updateSubmitState() {
    const btn = document.getElementById('sheet-submit');
    const badge = document.getElementById('sheet-badge');
    if (!btn) return;

    const activePanel = document.querySelector('[data-sheet-panel]:not(.hidden)');
    if (!activePanel) return;
    const which = activePanel.dataset.sheetPanel;

    let enabled = false;
    let count = 0;

    if (which === 'task') {
      // count selected pick rows in visible lists
      count = activePanel.querySelectorAll('.pick-row.selected').length;
      const otherActive = document.querySelector('.chip[data-cat="other"].active');
      if (otherActive) {
        const t = document.getElementById('other-title');
        if (t && t.value.trim().length > 0) enabled = true;
      } else {
        enabled = count > 0;
      }
    } else if (which === 'note') {
      const t = document.getElementById('note-text');
      enabled = !!(t && t.value.trim().length > 0);
    } else if (which === 'report') {
      const t = document.getElementById('report-text');
      enabled = !!(t && t.value.trim().length > 0);
    }

    btn.disabled = !enabled;

    if (badge) {
      if (which === 'task' && count > 0) {
        badge.textContent = String(count);
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  }

  // keep submit reactive to typing
  document.addEventListener('input', updateSubmitState);

  // submit closes the sheet (prototype: no real save)
  document.addEventListener('click', (e) => {
    if (e.target.closest('#sheet-submit')) {
      const btn = e.target.closest('#sheet-submit');
      if (btn && !btn.disabled) {
        // brief feedback then dismiss
        btn.style.opacity = '0.7';
        setTimeout(() => {
          btn.style.opacity = '';
          closeSheet();
        }, 160);
      }
    }
  });

  // ---------- task search ----------
  document.addEventListener('input', (e) => {
    if (e.target && e.target.id === 'task-search') {
      const q = e.target.value.trim().toLowerCase();
      const commonList = document.getElementById('common-list');
      if (!commonList) return;
      commonList.querySelectorAll('.pick-row').forEach((row) => {
        const txt = row.textContent.toLowerCase();
        row.style.display = !q || txt.includes(q) ? '' : 'none';
      });
    }
  });

  // ---------- drag-to-dismiss on handle ----------
  if (sheetHandle && sheet) {
    let startY = 0;
    let dragging = false;
    let currentTranslate = 0;

    const onStart = (y) => { startY = y; dragging = true; sheet.style.transition = 'none'; };
    const onMove = (y) => {
      if (!dragging) return;
      const dy = Math.max(0, y - startY);
      currentTranslate = dy;
      sheet.style.transform = `translateY(${dy}px)`;
    };
    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      sheet.style.transition = '';
      if (currentTranslate > 120) {
        sheet.style.transform = '';
        closeSheet();
      } else {
        sheet.style.transform = '';
      }
      currentTranslate = 0;
    };

    sheetHandle.addEventListener('mousedown', (e) => onStart(e.clientY));
    document.addEventListener('mousemove', (e) => onMove(e.clientY));
    document.addEventListener('mouseup', onEnd);

    sheetHandle.addEventListener('touchstart', (e) => onStart(e.touches[0].clientY), { passive: true });
    document.addEventListener('touchmove', (e) => onMove(e.touches[0].clientY), { passive: true });
    document.addEventListener('touchend', onEnd);
  }

  // ---------- esc to dismiss ----------
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sheet && sheet.classList.contains('open')) closeSheet();
  });
})();
