document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('categories-container');

  Api.getAllCategories()
    .then(function(res) {
      const deptMap = {};
      res.departments.forEach(function(d) {
        deptMap[d.department_id] = d.department_name;
      });

      const groups = {};
      res.categories.forEach(function(cat) {
        const deptId = cat.category_department_id;
        if (!groups[deptId]) groups[deptId] = [];
        groups[deptId].push(cat);
      });

      Object.keys(groups).forEach(function(deptId) {
        const section  = document.createElement('div');
        section.className = 'cat-group';

        const heading  = document.createElement('h2');
        heading.className = 'cat-group-title';
        heading.textContent = deptMap[deptId] || 'Other';

        const chips = document.createElement('div');
        chips.className = 'brands-row';

        groups[deptId].forEach(function(cat) {
          const a       = document.createElement('a');
          a.className   = 'brand-chip';
          a.href        = `index.html?dept=${deptId}`;
          a.textContent = cat.category_name;
          chips.appendChild(a);
        });

        section.append(heading, chips);
        container.appendChild(section);
      });
    })
    .catch(function() {
      container.textContent = 'Could not load categories. Please refresh.';
    });
});
