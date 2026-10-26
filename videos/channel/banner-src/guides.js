if (location.search.includes('guides')) {
  const stage = document.querySelector('.stage');
  for (const k of ['desk', 'tablet', 'phone']) {
    const g = document.createElement('div');
    g.className = 'guide ' + k;
    stage.appendChild(g);
  }
}
