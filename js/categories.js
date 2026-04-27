document.addEventListener('DOMContentLoaded', function() {
  const main = document.getElementById('cats-main');

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  Api.getAllCategories()
    .then(function(res) {
      const groups = {};
      res.categories.forEach(function(cat) {
        const id = cat.category_department_id;
        if (!groups[id]) groups[id] = [];
        groups[id].push(cat);
      });

      res.departments.forEach(function(dept) {
        const deptId = dept.department_id;
        const cats = groups[deptId];
        if (!cats || !cats.length) return;

        const block = document.createElement('div');
        block.className = 'dept-block';

        const header = document.createElement('div');
        header.className = 'dept-header';
        header.innerHTML = `
          <span class="dept-name">${escHtml(dept.department_name)}</span>
          <span class="dept-count">${cats.length} ${cats.length === 1 ? 'category' : 'categories'}</span>
          <div class="dept-divider"></div>`;

        const grid = document.createElement('div');
        grid.className = 'cat-grid';

        cats.forEach(function(cat) {
          const a = document.createElement('a');
          a.className = 'cat-card';
          a.href = `index.html?dept=${deptId}`;
          a.innerHTML = `<span class="cat-label">${escHtml(cat.category_name)}</span>`;
          grid.appendChild(a);
        });

        block.append(header, grid);
        main.appendChild(block);
      });
    })
    .catch(function() {
      main.textContent = 'Could not load categories. Please refresh.';
    });
});
