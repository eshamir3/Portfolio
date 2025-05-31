import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let xScale, yScale;
let commits = [];
let commitProgress = 100;
let commitMaxTime;
let timeScale;

const slider = document.getElementById('commit-progress');
const timeLabel = document.getElementById('commit-time');

async function loadData() {
  const data = await d3.csv('./loc.csv', row => {
    const datetime = new Date(row.datetime || `${row.date}T00:00${row.timezone || ''}`);
    return {
      ...row,
      line: +row.line,
      depth: +row.depth,
      length: +row.length,
      datetime,
      hourFrac: datetime.getHours() + datetime.getMinutes() / 60
    };
  });

  return d3.groups(data, d => d.commit).map(([commit, lines]) => {
    const first = lines[0];
    return {
      id: commit,
      lines,
      author: first.author,
      date: first.date,
      time: first.time,
      timezone: first.timezone,
      datetime: new Date(first.datetime),
      hourFrac: first.hourFrac,
      totalLines: lines.length,
      url: `https://github.com/eshamir3/Portfolio/commit/${commit}`
    };
  }).sort((a, b) => a.datetime - b.datetime);
}

function updateFiltered(filteredCommits) {
  updateScatterPlot(commits, filteredCommits);
  updateFileDisplay(filteredCommits);
}

function setupSlider() {
  slider.addEventListener('input', () => {
    commitProgress = +slider.value;
    commitMaxTime = timeScale.invert(commitProgress);
    timeLabel.textContent = commitMaxTime.toLocaleString("en", { dateStyle: "long", timeStyle: "short" });
    const filtered = commits.filter(d => d.datetime <= commitMaxTime);
    updateFiltered(filtered);
  });
}

function updateScatterPlot(all, filtered) {
  const svg = d3.select('#chart svg');
  const rScale = d3.scaleSqrt()
    .domain(d3.extent(all, d => d.totalLines))
    .range([2, 25]);

  const dots = svg.select('.dots')
    .selectAll('circle')
    .data(filtered, d => d.id);

  dots.join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .attr('fill', '#4682b4')
    .style('fill-opacity', 0.7);
}

function updateFileDisplay(filteredCommits) {
  const lines = filteredCommits.flatMap(d => d.lines);
  const files = d3.groups(lines, d => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const color = d3.scaleOrdinal(d3.schemeTableau10);

  const container = d3.select('#files')
    .selectAll('div')
    .data(files, d => d.name)
    .join(enter => enter.append('div').call(div => {
      div.append('dt').append('code');
      div.append('dd');
    }));

  container.select('dt > code')
    .html(d => `${d.name}<br><small>${d.lines.length} lines</small>`);

  container.attr('style', d => `--color: ${color(d.name)}`);

  container.select('dd')
    .selectAll('div')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc');
}

function renderStory(commits) {
  d3.select('#scatter-story')
    .selectAll('.step')
    .data(commits)
    .join('div')
    .attr('class', 'step')
    .html((d, i) => `
      On ${d.datetime.toLocaleString("en", { dateStyle: "full", timeStyle: "short" })},
      I made <a href="${d.url}" target="_blank">${i > 0 ? "another glorious commit" : "my first commit"}</a>.
      I edited ${d.totalLines} lines across ${new Set(d.lines.map(l => l.file)).size} files.
    `);
}

function setupScrollama() {
  const scroller = scrollama();
  scroller.setup({
    container: '#scrolly-1',
    step: '#scatter-story .step'
  }).onStepEnter(response => {
    const commit = response.element.__data__;
    commitMaxTime = commit.datetime;
    const filtered = commits.filter(d => d.datetime <= commitMaxTime);
    updateFiltered(filtered);
  });
}

function renderScatterPlot(commits) {
  const width = 1000, height = 500;
  const margin = { top: 30, right: 30, bottom: 50, left: 60 };
  const usable = {
    left: margin.left,
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };

  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([usable.left, usable.right])
    .nice();

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usable.bottom, usable.top]);

  svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${usable.bottom})`)
    .call(d3.axisBottom(xScale));

  svg.append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${usable.left}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat(d => `${String(d).padStart(2, '0')}:00`));

  svg.append('g')
    .attr('class', 'dots')
    .attr('transform', `translate(0, 0)`);
}

(async function main() {
  commits = await loadData();
  timeScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([0, 100]);
  commitMaxTime = timeScale.invert(commitProgress);

  renderScatterPlot(commits);
  renderStory(commits);
  setupSlider();
  setupScrollama();
  updateFiltered(commits.filter(d => d.datetime <= commitMaxTime));
})();
