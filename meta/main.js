import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let xScale, yScale;
let commits = [];
let commitProgress = 100;
let commitMaxTime;
let timeScale;

// ————————————————————————
// Cache DOM selectors
// ————————————————————————
const slider       = document.getElementById('commit-progress');
const timeLabel    = document.getElementById('commit-time');
const commitsEl    = document.getElementById('stat-commits');
const filesEl      = document.getElementById('stat-files');
const locEl        = document.getElementById('stat-loc');
const depthEl      = document.getElementById('stat-depth');
const longestEl    = document.getElementById('stat-longest');
const maxLinesEl   = document.getElementById('stat-maxlines');

// Tooltip fields
const tooltipLink    = document.getElementById('commit-link');
const tooltipDate    = document.getElementById('commit-date');
const tooltipTime    = document.getElementById('commit-time-tooltip');
const tooltipAuthor  = document.getElementById('commit-author');
const tooltipLines   = document.getElementById('commit-lines');

// =======================================
// 1) LOAD + PROCESS THE CSV INTO “commits”
// =======================================
async function loadData() {
  // 1a) Load every line of loc.csv; parse the datetime, numeric fields, etc.
  const data = await d3.csv('./loc.csv', row => {
    // If row.datetime is provided, use it; otherwise, assemble from date + timezone
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

  // 1b) Group all “lines” by commit SHA
  // Each commit object will have: { id, lines: [ ... ], author, datetime, hourFrac, totalLines, url, ... }
  const grouped = d3.groups(data, d => d.commit).map(([commitSha, lines]) => {
    const first = lines[0];
    return {
      id: commitSha,
      lines: lines,
      author: first.author,
      date: first.date,
      time: first.time,
      timezone: first.timezone,
      datetime: new Date(first.datetime),
      hourFrac: first.hourFrac,
      totalLines: lines.length,
      url: `https://github.com/eshamir3/Portfolio/commit/${commitSha}`
    };
  });

  // 1c) Sort commits chronologically (oldest → newest)
  grouped.sort((a, b) => a.datetime - b.datetime);

  return grouped;
}

// =======================================
// 2) RENDER SUMMARY STATS (TOP OF PAGE)
// =======================================
function renderSummaryStats(allLines, allCommits) {
  // COMMITS
  commitsEl.textContent = allCommits.length;

  // FILES: unique count of `line.file`
  const uniqueFiles = new Set(allLines.map(d => d.file)).size;
  filesEl.textContent = uniqueFiles;

  // TOTAL LOC: total number of rows in raw CSV (allLines.length)
  locEl.textContent = allLines.length;

  // MAX DEPTH: the maximum “depth” value across all rows
  const maxDepth = d3.max(allLines, d => d.depth);
  depthEl.textContent = maxDepth;

  // LONGEST LINE (in characters): max “length” field
  const longest = d3.max(allLines, d => d.length);
  longestEl.textContent = longest;

  // MAX LINES (i.e. the single commit with the most lines changed)
  const maxLines = d3.max(allCommits, d => d.totalLines);
  maxLinesEl.textContent = maxLines;
}

// ====================================================
// 3) SLIDER SETUP: updateFiltered() on “input” event
// ====================================================
function setupSlider() {
  slider.addEventListener('input', () => {
    commitProgress = +slider.value;
    commitMaxTime = timeScale.invert(commitProgress);
    timeLabel.textContent = commitMaxTime.toLocaleString("en", { dateStyle: "long", timeStyle: "short" });

    const filtered = commits.filter(d => d.datetime <= commitMaxTime);
    updateFiltered(filtered);
  });
}

// ====================================================
// 4) UPDATE THE SCATTER PLOT GIVEN filteredCommits
// ====================================================
function updateScatterPlot(allCommits, filteredCommits) {
  const svg = d3.select('#chart svg');
  const rScale = d3.scaleSqrt()
    .domain(d3.extent(allCommits, d => d.totalLines))
    .range([2, 25]);

  const dots = svg.select('.dots')
    .selectAll('circle')
    .data(filteredCommits, d => d.id);

  // JOIN / ENTER / UPDATE / EXIT
  dots.join(
    enter => enter.append('circle')
      .attr('cx', d => xScale(d.datetime))
      .attr('cy', d => yScale(d.hourFrac))
      .attr('r', d => rScale(d.totalLines))
      .attr('fill', '#4682b4')
      .style('fill-opacity', 0.7)
      .on('mouseenter', (event, commitObj) => {
        d3.select(event.currentTarget).style('fill-opacity', 1);
        renderTooltipContent(commitObj);
        updateTooltipVisibility(true);
        updateTooltipPosition(event);
      })
      .on('mouseleave', event => {
        d3.select(event.currentTarget).style('fill-opacity', 0.7);
        updateTooltipVisibility(false);
      }),
    update => update
      .transition().duration(200)
      .attr('cx', d => xScale(d.datetime))
      .attr('cy', d => yScale(d.hourFrac))
      .attr('r', d => rScale(d.totalLines)),
    exit => exit.remove()
  );
}

// ====================================================
// 5) UPDATE THE UNIT VISUALIZATION (“FILES BY SIZE”)
// ====================================================
function updateFileDisplay(filteredCommits) {
  // Gather all “lines” from the filtered commits
  const lines = filteredCommits.flatMap(d => d.lines);

  // Group by file name, then sort by descending line count
  const files = d3.groups(lines, d => d.file)
    .map(([name, linesArr]) => ({
      name: name,
      lines: linesArr
    }))
    .sort((a, b) => b.lines.length - a.lines.length);

  // Color scale for file‐type (using each file’s “type” from its first line)
  const colorScale = d3.scaleOrdinal(d3.schemeTableau10);

  // Bind to <div> blocks under <dl id="files">
  const container = d3.select('#files')
    .selectAll('div')
    .data(files, d => d.name)
    .join(enter => enter.append('div').call(div => {
      div.append('dt').append('code'); // file name + line count
      div.append('dd');               // will contain .loc dots
    }));

  // Update the <code> inside <dt> to show “filename\n<small>XX lines</small>”
  container.select('dt > code')
    .html(d => `${d.name}<br><small>${d.lines.length} lines</small>`);

  // Set custom CSS variable (--color) based on the file’s “type”
  container.attr('style', d => {
    const fileType = d.lines[0].type; 
    return `--color: ${colorScale(fileType)}`;
  });

  // Now, for each <dd>, bind one <div class="loc"> per line of code
  container.select('dd')
    .selectAll('div')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc');
}

// ====================================================
// 6) RENDER THE “STORY”: one <div class="step"> per commit
// ====================================================
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

// ====================================================
// 7) SETUP SCROLLAMA TO WATCH FOR STEPS ENTERING VIEW
// ====================================================
function setupScrollama() {
  const scroller = scrollama();
  scroller
    .setup({
      container: '#scrolly-1',
      step: '#scatter-story .step'
    })
    .onStepEnter(response => {
      // When a step enters, take its bound data (commit object) and filter up to that datetime
      const commitObj = response.element.__data__;
      commitMaxTime = commitObj.datetime;
      const filtered = commits.filter(d => d.datetime <= commitMaxTime);
      updateFiltered(filtered);
    });
}

// ====================================================
// 8) INITIAL SCATTERPLOT RENDER (called once on load)
// ====================================================
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

  // X‐axis (dates)
  svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${usable.bottom})`)
    .call(d3.axisBottom(xScale));

  // Y‐axis (hour of day)
  svg.append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${usable.left}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat(d => `${String(d).padStart(2, '0')}:00`));

  // A <g class="dots"> to hold all circles
  svg.append('g')
    .attr('class', 'dots');
}

// ====================================================
// 9) TOOLTIP HELPERS
// ====================================================
function renderTooltipContent(commit) {
  tooltipLink.href           = commit.url;
  tooltipLink.textContent    = commit.id;
  tooltipDate.textContent    = commit.datetime.toLocaleDateString();
  tooltipTime.textContent    = commit.datetime.toLocaleTimeString();
  tooltipAuthor.textContent  = commit.author;
  tooltipLines.textContent   = commit.totalLines;
}

function updateTooltipVisibility(show) {
  document.getElementById('commit-tooltip').hidden = !show;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  // offset slightly so cursor doesn’t sit directly on top
  tooltip.style.left = `${event.clientX + 10}px`;
  tooltip.style.top  = `${event.clientY + 10}px`;
}

// ====================================================
// 10) ENTRY POINT: load data, render everything
// ====================================================
(async function main() {
  // 10a) Load + process
  const rawLines = await d3.csv('./loc.csv', row => {
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

  // Group by commit and sort
  commits = d3.groups(rawLines, d => d.commit).map(([commitSha, lines]) => {
    const first = lines[0];
    return {
      id: commitSha,
      lines: lines,
      author: first.author,
      date: first.date,
      time: first.time,
      timezone: first.timezone,
      datetime: new Date(first.datetime),
      hourFrac: first.hourFrac,
      totalLines: lines.length,
      url: `https://github.com/eshamir3/Portfolio/commit/${commitSha}`
    };
  }).sort((a, b) => a.datetime - b.datetime);

  // 10b) Compute summary stats and render at top
  renderSummaryStats(rawLines, commits);

  // 10c) Build UI:
  renderScatterPlot(commits);   // draw empty axes + dots container
  renderStory(commits);         // populate #scatter-story with <div class="step">…
  setupSlider();                // attach “input” listener to the range slider
  setupScrollama();             // attach scrollama to the .step elements

  // 10d) Set up the time scale for slider:
  timeScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([0, 100]);

  // Initialize commitMaxTime & slider label
  commitMaxTime = timeScale.invert(commitProgress);
  timeLabel.textContent = commitMaxTime.toLocaleString("en", { dateStyle: "long", timeStyle: "short" });

  // 10e) Finally, draw initial circles + files (all commits ≤ initial commitMaxTime)
  const initiallyFiltered = commits.filter(d => d.datetime <= commitMaxTime);
  updateFiltered(initiallyFiltered);
})();
