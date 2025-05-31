// main.js
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3/+esm';

let commits = [];
let xScale, yScale;

async function loadData() {
  const rows = await d3.csv('./loc.csv', d => {
    const datetime = new Date(d.datetime);
    return {
      ...d,
      datetime,
      hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
      line: +d.line
    };
  });
  const grouped = d3.groups(rows, d => d.commit).map(([sha, lines]) => {
    const first = lines[0];
    return {
      id: sha,
      lines,
      datetime: new Date(first.datetime),
      totalLines: lines.length,
      url: `https://github.com/your/repo/commit/${sha}`
    };
  });
  grouped.sort((a, b) => a.datetime - b.datetime);
  return grouped;
}

function renderScatterPlot(commits) {
  const svg = d3.select('#chart').append('svg')
    .attr('viewBox', '0 0 1000 600')
    .attr('preserveAspectRatio', 'xMidYMid meet');

  xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([60, 940]);

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([550, 50]);

  svg.append('g')
    .attr('transform', 'translate(0,550)')
    .call(d3.axisBottom(xScale).tickSizeOuter(0))
    .attr('font-size', '16px');

  svg.append('g')
    .attr('transform', 'translate(60,0)')
    .call(d3.axisLeft(yScale).tickFormat(d => `${d}:00`).tickSizeOuter(0))
    .attr('font-size', '16px');

  svg.append('g')
    .attr('class', 'dots')
    .selectAll('circle')
    .data(commits)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => Math.sqrt(d.totalLines))
    .attr('fill', '#2196f3')
    .attr('fill-opacity', 0.7);
}

function renderStoryScatter(commits) {
  d3.select('#scatter-story')
    .selectAll('.step')
    .data(commits)
    .join('div')
    .attr('class', 'step')
    .html((d, i) => `
      On ${d.datetime.toLocaleString('en', { dateStyle: 'full', timeStyle: 'short' })},
      I made <a href="${d.url}" target="_blank">${i === 0 ? 'my first commit, and it was glorious' : 'another glorious commit'}</a>.
      I edited ${d.totalLines} lines across ${new Set(d.lines.map(l => l.file)).size} files.
    `);
}

function setupScrollamaScatter() {
  const scroller = scrollama();
  scroller
    .setup({ container: '#scrolly-1', step: '#scatter-story .step', offset: 0.5 })
    .onStepEnter(response => {
      const datetime = response.element.__data__.datetime;
      const filtered = commits.filter(d => d.datetime <= datetime);
      updateScatterPlot(commits, filtered);
    });
}

function updateScatterPlot(allCommits, filtered) {
  const svg = d3.select('#chart svg');
  const dots = svg.select('.dots')
    .selectAll('circle')
    .data(filtered, d => d.id);

  dots.join(
    enter => enter.append('circle')
      .attr('cx', d => xScale(d.datetime))
      .attr('cy', d => yScale(d.hourFrac))
      .attr('r', d => Math.sqrt(d.totalLines))
      .attr('fill', '#2196f3')
      .attr('fill-opacity', 0.7),
    update => update
      .transition().duration(300)
      .attr('cx', d => xScale(d.datetime))
      .attr('cy', d => yScale(d.hourFrac))
      .attr('r', d => Math.sqrt(d.totalLines)),
    exit => exit.remove()
  );
}

function renderFileStory(commits) {
  d3.select('#file-story')
    .selectAll('.step')
    .data(commits)
    .join('div')
    .attr('class', 'step')
    .html((d, i) => `
      On ${d.datetime.toLocaleString('en', { dateStyle: 'full', timeStyle: 'short' })},
      I made <a href="${d.url}" target="_blank">${i === 0 ? 'my first commit, and it was glorious' : 'another glorious commit'}</a>.
      I edited ${d.totalLines} lines across ${new Set(d.lines.map(l => l.file)).size} files.
    `);
}

function setupScrollamaFiles() {
  const scroller = scrollama();
  scroller
    .setup({ container: '#scrolly-2', step: '#file-story .step', offset: 0.5 })
    .onStepEnter(response => updateFileViz(response.element.__data__));
}

function updateFileViz(commitObj) {
  const lines = commitObj.lines;
  const files = d3.groups(lines, d => d.file)
    .map(([file, lines]) => ({ name: file, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const container = d3.select('#file-viz')
    .selectAll('dl')
    .data(files, d => d.name)
    .join(
      enter => enter.append('dl').call(dl => {
        dl.append('dt');
        dl.append('dd');
      })
    );

  container.select('dt')
    .html(d => `<code>${d.name}</code><br><small>${d.lines.length} lines</small>`);

  container.select('dd')
    .selectAll('div')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc');
}

(async function main() {
  commits = await loadData();
  renderScatterPlot(commits);
  renderStoryScatter(commits);
  setupScrollamaScatter();
  renderFileStory(commits);
  setupScrollamaFiles();
  updateFileViz(commits[0]);
})();
