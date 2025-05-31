import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let xScale, yScale;
let commits = [];
let commitProgress = 100;
let commitMaxTime;
let timeScale;

// ———————————————————————
// 1) CACHE DOM SELECTORS
// ———————————————————————
const slider         = document.getElementById('commit-progress');
const timeLabel      = document.getElementById('commit-time');
const commitsEl      = document.getElementById('stat-commits');
const filesEl        = document.getElementById('stat-files');
const locEl          = document.getElementById('stat-loc');
const depthEl        = document.getElementById('stat-depth');
const longestEl      = document.getElementById('stat-longest');
const maxLinesEl     = document.getElementById('stat-maxlines');

const tooltipEl      = document.getElementById('commit-tooltip');
const tooltipLink    = document.getElementById('commit-link');
const tooltipDate    = document.getElementById('commit-date');
const tooltipTime    = document.getElementById('commit-time-tooltip');
const tooltipAuthor  = document.getElementById('commit-author');
const tooltipLines   = document.getElementById('commit-lines');

const pieContainer   = d3.select('#pie');
const pieLegendDiv   = d3.select('.pie-legend');

// ———————————————————————
// 2) LOAD + PROCESS “loc.csv” INTO commits[]
// ———————————————————————
async function loadData() {
  // 2a) Load every row, parse date/time, numeric fields
  const rows = await d3.csv('./loc.csv', row => {
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

  // 2b) Group all “lines” by commit SHA → one object per commit
  const grouped = d3.groups(rows, d => d.commit).map(([sha, lines]) => {
    const first = lines[0];
    return {
      id: sha,
      lines: lines,
      author: first.author,
      date: first.date,
      time: first.time,
      timezone: first.timezone,
      datetime: new Date(first.datetime),
      hourFrac: first.hourFrac,
      totalLines: lines.length,
      url: `https://github.com/eshamir3/Portfolio/commit/${sha}`
    };
  });

  // 2c) Sort commits oldest → newest
  grouped.sort((a, b) => a.datetime - b.datetime);
  return [grouped, rows];
}

// ———————————————————————
// 3) RENDER SUMMARY STATS (TOP GRID)
// ———————————————————————
function renderSummaryStats(allRows, allCommits) {
  commitsEl.textContent   = allCommits.length;
  filesEl.textContent     = new Set(allRows.map(d => d.file)).size;
  locEl.textContent       = allRows.length;
  depthEl.textContent     = d3.max(allRows, d => d.depth);
  longestEl.textContent   = d3.max(allRows, d => d.length);
  maxLinesEl.textContent  = d3.max(allCommits, d => d.totalLines);
}

// ———————————————————————
// 4) SETUP THE SLIDER
// ———————————————————————
function setupSlider() {
  slider.addEventListener('input', () => {
    commitProgress  = +slider.value;
    commitMaxTime   = timeScale.invert(commitProgress);
    timeLabel.textContent = commitMaxTime.toLocaleString('en', { dateStyle: 'long', timeStyle: 'short' });

    const filtered = commits.filter(d => d.datetime <= commitMaxTime);
    updateFiltered(filtered);
  });
}

// ———————————————————————
// 5) RENDER SCATTER PLOT (ONCE)
// ———————————————————————
function renderScatterPlot(allCommits) {
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
    .domain(d3.extent(allCommits, d => d.datetime))
    .range([usable.left, usable.right])
    .nice();

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usable.bottom, usable.top]);

  // X‐axis
  svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${usable.bottom})`)
    .call(d3.axisBottom(xScale));

  // Y‐axis (hours)
  svg.append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${usable.left}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat(d => `${String(d).padStart(2, '0')}:00`));

  // Container for dotted circles
  svg.append('g').attr('class', 'dots');
}

// ———————————————————————
// 6) UPDATE SCATTER PLOT ON FILTERED COMMITS
// ———————————————————————
function updateScatterPlot(allCommits, filteredCommits) {
  const svg = d3.select('#chart svg');
  const rScale = d3.scaleSqrt()
    .domain(d3.extent(allCommits, d => d.totalLines))
    .range([2, 25]);

  const dots = svg.select('.dots')
    .selectAll('circle')
    .data(filteredCommits, d => d.id);

  // ENTER / UPDATE / EXIT
  dots.join(
    enter => enter.append('circle')
      .attr('cx', d => xScale(d.datetime))
      .attr('cy', d => yScale(d.hourFrac))
      .attr('r', d => rScale(d.totalLines))
      .on('mouseenter', (event, commitObj) => {
        d3.select(event.currentTarget).style('fill-opacity', 1);
        showTooltip(commitObj);
        moveTooltip(event);
      })
      .on('mousemove', event => moveTooltip(event))
      .on('mouseleave', event => {
        d3.select(event.currentTarget).style('fill-opacity', 0.7);
        hideTooltip();
      })
      .attr('fill', '#2196f3')
      .style('fill-opacity', 0.7),
    update => update.transition().duration(200)
      .attr('cx', d => xScale(d.datetime))
      .attr('cy', d => yScale(d.hourFrac))
      .attr('r', d => rScale(d.totalLines)),
    exit => exit.remove()
  );
}

// ———————————————————————
// 7) RENDER UNIT VISUALIZATION (FILES BY SIZE)
// ———————————————————————
function updateFileDisplay(filteredCommits) {
  const lines = filteredCommits.flatMap(d => d.lines);
  const files = d3.groups(lines, d => d.file)
    .map(([name, arr]) => ({ name, lines: arr }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

  const container = d3.select('#files')
    .selectAll('dl')
    .data(files, d => d.name)
    .join(
      enter => enter.append('dl').call(dl => {
        dl.append('dt');
        dl.append('dd');
      })
    );

  container.select('dt')
    .html(d => `${d.name}<br><small>${d.lines.length} lines</small>`);

  container.select('dd')
    .style('--color', d => colorScale(d.lines[0].type))
    .selectAll('div')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc');
}

// ———————————————————————
// 8) RENDER THE SCROLL “STORY”
// ———————————————————————
function renderStory(allCommits) {
  d3.select('#scatter-story')
    .selectAll('.step')
    .data(allCommits)
    .join('div')
    .attr('class', 'step')
    .html((d, i) => `
      On ${d.datetime.toLocaleString('en', { dateStyle: 'full', timeStyle: 'short' })},
      I made <a href="${d.url}" target="_blank">${i > 0 ? 'another glorious commit' : 'my first commit'}</a>.
      I edited ${d.totalLines} lines across ${new Set(d.lines.map(l => l.file)).size} files.
    `);
}

// ———————————————————————
// 9) SETUP SCROLLAMA
// ———————————————————————
function setupScrollama() {
  const scroller = scrollama();
  scroller
    .setup({
      container: '#scrolly-1',
      step: '#scatter-story .step',
      offset: 0.5
    })
    .onStepEnter(response => {
      const commitObj = response.element.__data__;
      commitMaxTime = commitObj.datetime;
      const filtered = commits.filter(d => d.datetime <= commitMaxTime);
      updateFiltered(filtered);
    });
}

// ———————————————————————
// 10) TOOLTIP HELPERS
// ———————————————————————
function showTooltip(commitObj) {
  tooltipLink.href           = commitObj.url;
  tooltipLink.textContent    = commitObj.id;
  tooltipDate.textContent    = commitObj.datetime.toLocaleDateString();
  tooltipTime.textContent    = commitObj.datetime.toLocaleTimeString();
  tooltipAuthor.textContent  = commitObj.author;
  tooltipLines.textContent   = commitObj.totalLines;
  tooltipEl.classList.add('visible');
}

function moveTooltip(event) {
  const x = event.clientX + 10;
  const y = event.clientY + 10;
  tooltipEl.style.left = x + 'px';
  tooltipEl.style.top  = y + 'px';
}

function hideTooltip() {
  tooltipEl.classList.remove('visible');
}

// ———————————————————————
// 11) DRAW STATIC PIE CHART OF LANGUAGE BREAKDOWN
// ———————————————————————
function drawPieChart(allRows) {
  // Count lines by type
  const breakdown = Array.from(
    d3.rollup(allRows, v => v.length, d => d.type),
    ([type, count]) => ({ type, count })
  );

  // Set dimensions
  const width = 300,
        height = 300,
        radius = Math.min(width, height) / 2 - 10;

  const svg = pieContainer
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width/2},${height/2})`);

  const color = d3.scaleOrdinal()
    .domain(breakdown.map(d => d.type))
    .range(d3.schemeTableau10);

  const pieGen = d3.pie()
    .value(d => d.count)
    .sort(null);

  const arcGen = d3.arc()
    .innerRadius(0)
    .outerRadius(radius);

  const slices = svg
    .selectAll('path')
    .data(pieGen(breakdown))
    .join('path')
    .attr('d', arcGen)
    .attr('fill', d => color(d.data.type))
    .style('stroke', '#fff')
    .style('stroke-width', '1px');

  // Build legend
  const legend = pieLegendDiv
    .selectAll('.legend-item')
    .data(breakdown)
    .join('div')
    .attr('class', 'legend-item');

  legend.append('span')
    .attr('class', 'swatch')
    .style('background', d => color(d.type));

  legend.append('span')
    .text(d => `${d.type} (${d.count})`);
}

// ———————————————————————
// 12) APPLY FILTERED LIST TO BOTH VISUALS
// ———————————————————————
function updateFiltered(filteredList) {
  updateScatterPlot(commits, filteredList);
  updateFileDisplay(filteredList);
}

// ———————————————————————
// 13) MAIN ENTRY POINT
// ———————————————————————
(async function main() {
  // 13a) Load and process data (returns [commitsArray, rawRowsArray])
  const [commitsArr, rawRows] = await loadData();
  commits = commitsArr;

  // 13b) Render summary‐stats at top
  renderSummaryStats(rawRows, commits);

  // 13c) Draw scatter‐plot axes + empty dots container
  renderScatterPlot(commits);

  // 13d) Populate the “story” steps (left column)
  renderStory(commits);

  // 13e) Draw the static pie chart (showing total lines by type)
  drawPieChart(rawRows);

  // 13f) Setup slider → on input, call updateFiltered()
  setupSlider();

  // 13g) Build timeScale from commit dates → [0..100] range
  timeScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([0, 100]);
  commitMaxTime = timeScale.invert(commitProgress);
  timeLabel.textContent = commitMaxTime.toLocaleString('en', { dateStyle: 'long', timeStyle: 'short' });

  // 13h) Setup scrollama → on step enter, filter scatter + unit viz
  setupScrollama();

  // 13i) Finally, draw initial circles and unit viz for all commits ≤ commitMaxTime
  const initiallyFiltered = commits.filter(d => d.datetime <= commitMaxTime);
  updateFiltered(initiallyFiltered);
})();
