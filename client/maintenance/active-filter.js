"use strict";

(() => {
  const tableElement = document.querySelector(".records-card table");
  const heading = document.querySelector(".records-card .records-heading");
  const title = heading?.querySelector("h2");
  if (!tableElement || !heading || !title || !window.jQuery?.fn?.dataTable) return;

  const allTitle = title.textContent.trim();
  const activeTitle = /^all\s+/i.test(allTitle)
    ? allTitle.replace(/^all\s+/i, "Active ")
    : `Active ${allTitle.charAt(0).toLowerCase()}${allTitle.slice(1)}`;

  const actions = document.createElement("div");
  actions.className = "maintenance-heading-actions";
  [...heading.children].slice(1).forEach((element) => actions.appendChild(element));

  const toggle = document.createElement("label");
  toggle.className = "maintenance-inactive-toggle";
  toggle.innerHTML = `
    <span>Show inactive</span>
    <input type="checkbox" aria-label="Show inactive records">
    <span class="switch" aria-hidden="true"></span>`;
  actions.prepend(toggle);
  heading.appendChild(actions);
  title.textContent = activeTitle;

  const checkbox = toggle.querySelector("input");
  jQuery.fn.dataTable.ext.search.push((settings, _searchData, dataIndex) => {
    if (settings.nTable !== tableElement || checkbox.checked) return true;
    return Number(settings.aoData[dataIndex]?._aData?.is_active) === 1;
  });

  checkbox.addEventListener("change", () => {
    title.textContent = checkbox.checked ? allTitle : activeTitle;
    if (jQuery.fn.dataTable.isDataTable(tableElement)) {
      jQuery(tableElement).DataTable().draw();
    }
  });
})();
