// ———————————————————————
// meta/main.js
// ———————————————————————

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
const slider       = document.getElementById('commit-progress');
const timeLabel    = document.getElementById('commit-time');
const commitsEl    = document.getElementById('stat-commits');
const filesEl      = document.getElementById('stat-files');
const locEl        = document.getElementById('stat-loc');
const depthEl      = document.getElementById('stat-depth');
const longestEl    = document.getElementById('stat-longest');
const maxLinesEl   = document.getElementById('stat-maxlines');

const tooltipEl    = document.getElementById('commit-tooltip');
const tooltipLink  = document.getElementById('commit-link');
const tooltipDate  = document.getElementById('commit-date');
const tooltipTime  = document.getElementById('commit-time-tooltip');
const tooltipAuthor= document.getElementById('commit-author');
const tooltipLines = document.getElementById('commit-lines');

const pieContainer = d3.select('#pie');
const pieLegendDiv = d3.select('.pie-legend');

// For the bottom unit-viz scrolly:
const fileVizDiv   = d3.select('#file-viz');
const fileStoryDiv = d3.select('#file-story');

// ———————————————————————
// 2) LOAD + PROCESS "loc.csv" INTO `commits[]`
// ———————————————————————
async function loadData() {
  // 2a) Load each CSV row, parse numeric & date fields
  const rows = await d3.csv('./loc.csv', row => {
    const datetime = new Date(row.datetime || `${row.date}T00:00${row.timezone || ''}`);
    return {
      ...row,
      line:   +row.line,
      depth:  +row.depth,
      length: +row.length,
      datetime,
      hourFrac: datetime.getHours() + datetime.getMinutes() / 60
    };
  });

  // 2b) Group all "lines" by commit SHA → produce one object per commit
  const grouped = d3.groups(rows, d => d.commit).map(([sha, lines]) => {
    const first = lines[0];
    return {
      id:         sha,
      lines:      lines,
      author:     first.author,
      date:       first.date,
      time:       first.time,
      timezone:   first.timezone,
      datetime:   new Date(first.datetime),
      hourFrac:   first.hourFrac,
      totalLines: lines.length,
      // Replace YOURUSERNAME/YOURREPO with your GitHub username and repo name
      url:        `https://github.com/eshamir/Portfolio/commit/${sha}`
    };
  });

  // 2c) Sort commits by ascending datetime
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
// 4) SET UP THE SLIDER
// ———————————————————————
function setupSlider() {
  slider.addEventListener('input', () => {
    commitProgress       = +slider.value;
    commitMaxTime        = timeScale.invert(commitProgress);
    timeLabel.textContent = commitMaxTime.toLocaleString('en', {
      dateStyle: 'long',
      timeStyle: 'short'
    });

    const filtered = commits.filter(d => d.datetime <= commitMaxTime);
    updateFilteredScatter(filtered);
  });
}

// ———————————————————————
// 5) RENDER SCATTER PLOT (once at start)
// ———————————————————————
function renderScatterPlot(allCommits) {
  const width  = 1000, height = 500;
  const margin = { top: 30, right: 30, bottom: 60, left: 70 };
  const usable = {
    left:   margin.left,
    top:    margin.top,
    right:  width - margin.right,
    bottom: height - margin.bottom,
    width:  width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };

  // Create SVG
  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  // X scale
  xScale = d3.scaleTime()
    .domain(d3.extent(allCommits, d => d.datetime))
    .range([usable.left, usable.right])
    .nice();

  // Y scale (0–24 hours)
  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usable.bottom, usable.top]);

  // X-axis
  svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${usable.bottom})`)
    .call(
      d3.axisBottom(xScale)
        .tickSize(-usable.height)
        .tickPadding(10)
    )
    .selectAll('text')
    .attr('font-size', '0.9rem');

  // Y-axis
  svg.append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${usable.left}, 0)`)
    .call(
      d3.axisLeft(yScale)
        .tickFormat(d => `${String(d).padStart(2, '0')}:00`)
        .tickSize(-usable.width)
        .tickPadding(10)
    )
    .selectAll('text')
    .attr('font-size', '0.9rem');

  // Group for circles
  svg.append('g').attr('class', 'dots');
}

// ———————————————————————
// 6) UPDATE SCATTER PLOT (for each filter OR scroll step)
// ———————————————————————
function updateScatterPlot(allCommits, filteredCommits) {
  const svg    = d3.select('#chart svg');
  const rScale = d3.scaleSqrt()
    .domain(d3.extent(allCommits, d => d.totalLines))
    .range([3, 25]); // adjust max radius as you like

  const dots = svg.select('.dots')
    .selectAll('circle')
    .data(filteredCommits, d => d.id);

  // ENTER / UPDATE / EXIT
  dots.join(
    // ENTER
    enter => enter.append('circle')
      .attr('cx', d => xScale(d.datetime))
      .attr('cy', d => yScale(d.hourFrac))
      .attr('r', d => rScale(d.totalLines))
      .attr('fill', d => {
        // color by file extension of the largest-file in that commit
        const ext = d.lines
          .sort((a, b) => b.line - a.line)[0]
          .file.split('.').pop().toLowerCase();
        return extensionColor(ext);
      })
      .style('fill-opacity', 0.7)
      .on('mouseenter', (event, commitObj) => {
        d3.select(event.currentTarget).style('fill-opacity', 1);
        showTooltip(commitObj);
        moveTooltip(event);
      })
      .on('mousemove', event => moveTooltip(event))
      .on('mouseleave', event => {
        d3.select(event.currentTarget).style('fill-opacity', 0.7);
        hideTooltip();
      }),

    // UPDATE
    update => update.transition().duration(200)
      .attr('cx', d => xScale(d.datetime))
      .attr('cy', d => yScale(d.hourFrac))
      .attr('r', d => rScale(d.totalLines)),

    // EXIT
    exit => exit.remove()
  );
}

// ———————————————————————
// 7) DRAW STATIC PIE CHART OF LANGUAGE BREAKDOWN
// ———————————————————————
function drawPieChart(allRows) {
  const breakdown = Array.from(
    d3.rollup(allRows, v => v.length, d => d.type),
    ([type, count]) => ({ type, count })
  );

  const width  = 300, height = 300, radius = Math.min(width, height) / 2 - 10;
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

  svg.selectAll('path')
    .data(pieGen(breakdown))
    .join('path')
    .attr('d', arcGen)
    .attr('fill', d => color(d.data.type))
    .style('stroke', '#fff')
    .style('stroke-width', '1px');

  // Legend
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
// 8) RENDER SCROLL "STORY" FOR SCATTER
// ———————————————————————
function renderStoryScatter(allCommits) {
  d3.select('#scatter-story')
    .selectAll('.step')
    .data(allCommits)
    .join('div')
    .attr('class', 'step')
    .html((d, i) => `
      On ${d.datetime.toLocaleString('en', { dateStyle: 'full', timeStyle: 'short' })},
      I made <a href="${d.url}" target="_blank">${i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'}</a>.
      I edited ${d.totalLines} lines across ${new Set(d.lines.map(l => l.file)).size} files.
    `);
}

// ———————————————————————
// 9) SET UP SCROLLAMA TO HANDLE STEPS FOR SCATTER
// ———————————————————————
function setupScrollamaScatter() {
  const scroller = scrollama();
  scroller
    .setup({
      container: '#scrolly-1',
      step: '#scatter-story .step',
      offset: 0.5
    })
    .onStepEnter(response => {
      const commitObj   = response.element.__data__;
      commitMaxTime     = commitObj.datetime;
      const filtered    = commits.filter(d => d.datetime <= commitMaxTime);
      updateFilteredScatter(filtered);
    });
}

// ———————————————————————
// Helper for Scatter: UPDATE both axis + circles
// ———————————————————————
function updateFilteredScatter(filteredList) {
  // 1) update x‐scale domain to filteredList
  xScale.domain(d3.extent(filteredList, d => d.datetime));
  d3.select('#chart svg')
    .select('g.x-axis')
    .call(
      d3.axisBottom(xScale)
        .tickSize(-(d3.select('#chart').node().clientHeight - 60)) // match gridlines height
        .tickPadding(10)
    );

  // 2) update circles
  updateScatterPlot(commits, filteredList);
}

// ———————————————————————
// 10) TOOLTIP HELPERS (SCATTER)
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
  // Position it just offset from cursor
  const x = event.clientX + 10;
  const y = event.clientY + 10;
  tooltipEl.style.left = x + 'px';
  tooltipEl.style.top  = y + 'px';
}
function hideTooltip() {
  tooltipEl.classList.remove('visible');
}

// ———————————————————————
// 11) "RENDER THE STORY" FOR THE UNIT-VIZ (Bottom)
// ———————————————————————
function renderFileStory(allCommits) {
  d3.select('#file-story')
    .selectAll('.step')
    .data(allCommits)
    .join('div')
    .attr('class', 'step')
    .html((d, i) => `
      On ${d.datetime.toLocaleString('en', { dateStyle: 'full', timeStyle: 'short' })},
      I made <a href="${d.url}" target="_blank">${i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'}</a>.
      I edited ${d.totalLines} lines across ${new Set(d.lines.map(l => l.file)).size} files.
    `);
}

// ———————————————————————
// 12) SET UP SCROLLAMA FOR THE UNIT-VIZ (Bottom)
// ———————————————————————
function setupScrollamaFiles() {
  const scroller = scrollama();
  scroller
    .setup({
      container: '#scrolly-2',
      step: '#file-story .step',
      offset: 0.5
    })
    .onStepEnter(response => {
      const commitObj = response.element.__data__;
      updateFileVizForCommit(commitObj);
    });
}

// ———————————————————————
// 13) UPDATE THE UNIT-VIZ FOR ONE COMMIT (Bottom)
// ———————————————————————
function updateFileVizForCommit(commitObj) {
  // Find the index of the current commit
  const commitIdx = commits.findIndex(c => c.id === commitObj.id);
  // Accumulate all lines from the first commit up to and including the current commit
  const lines = commits.slice(0, commitIdx + 1).flatMap(c => c.lines);

  // Group them by file name, then sort descending by line‐count
  const files = d3.groups(lines, d => d.file)
    .map(([name, arr]) => ({
      name,
      lines: arr,
      ext:   name.split('.').pop().toLowerCase()
    }))
    .sort((a, b) => b.lines.length - a.lines.length);

  // Color scale by extension
  const extColor = d3.scaleOrdinal()
    .domain(['css', 'js', 'html', 'svelte', 'ts', 'json', 'md'])
    .range(d3.schemeTableau10);

  // Bind to <dl> in #file-viz
  const container = fileVizDiv
    .selectAll('dl')
    .data(files, d => d.name)
    .join(
      enter => enter.append('dl').call(dl => {
        dl.append('dt');
        dl.append('dd');
      }),
      update => update
    );

  // Update the <dt> with filename + line count
  container.select('dt')
    .html(d => `<code>${d.name}</code><br><small>${d.lines.length} lines</small>`);

  // Update the <dd> with one <div class="loc"> per line
  container.select('dd')
    .selectAll('div')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc')
    .attr('style', d => `--color: ${extColor(d.file.split('.').pop().toLowerCase())}`);
}

// ———————————————————————
// 14) Color-by-extension helper (for scatter bubbles)
// ———————————————————————
function extensionColor(ext) {
  const scale = d3.scaleOrdinal()
    .domain(['css','js','html','svelte','ts','json','md'])
    .range(d3.schemeTableau10);
  return scale(ext);
}

// ———————————————————————
// 15) MAIN ENTRY POINT
// ———————————————————————
(async function main() {
  // 15a) Load + process data → [commitsArray, rawRowsArray]
  const [commitsArr, rawRows] = await loadData();
  commits = commitsArr;

  // 15b) Render top summary stats
  renderSummaryStats(rawRows, commits);

  // 15c) Draw scatter plot axes + empty "dots" group
  renderScatterPlot(commits);

  // 15d) Populate story steps on left (Scatter)
  renderStoryScatter(commits);

  // 15e) Draw static pie chart (language breakdown)
  drawPieChart(rawRows);

  // 15f) Set up slider (filters on input)
  setupSlider();

  // 15g) Build timeScale [0..100] for slider
  timeScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([0, 100]);
  commitMaxTime = timeScale.invert(commitProgress);
  timeLabel.textContent = commitMaxTime.toLocaleString('en', {
    dateStyle: 'long',
    timeStyle: 'short'
  });

  // 15h) Set up Scrollama for scatter scrollytelling
  setupScrollamaScatter();

  // 15i) Draw initial filtered visuals (all commits ≤ commitMaxTime)
  const initiallyFiltered = commits.filter(d => d.datetime <= commitMaxTime);
  updateFilteredScatter(initiallyFiltered);

  // ===== bottom "Codebase evolution" scrollytelling =====

  // 15j) Populate story steps on right (File-story)
  renderFileStory(commits);

  // 15k) Set up Scrollama for files scrollytelling
  setupScrollamaFiles();

  // 15l) Initialize the unit-viz with the very first commit
  if (commits.length > 0) {
    updateFileVizForCommit(commits[0]);
  }
})();
