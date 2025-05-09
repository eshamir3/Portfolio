import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let xScale, yScale;
let commits = [];

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

  console.log("Parsed datetimes:", data.map(d => d.datetime));
  return data;
}

function processCommits(data) {
  return d3.groups(data, d => d.commit).map(([commit, lines]) => {
    const first = lines[0];
    const { author, date, time, timezone, datetime, hourFrac } = first;

    const obj = {
      id: commit,
      url: `https://github.com/eshamir3/Portfolio/commit/${commit}`,
      author,
      date,
      time,
      timezone,
      datetime,
      hourFrac,
      totalLines: lines.length,
    };

    Object.defineProperty(obj, 'lines', {
      value: lines,
      enumerable: false
    });

    return obj;
  });
}

function renderCommitInfo(data, commits) {
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  dl.append('dt').text('Total commits');
  dl.append('dd').text(commits.length);

  dl.append('dt').text('Number of files');
  dl.append('dd').text(d3.group(data, d => d.file).size);

  const fileLengths = d3.rollups(data, v => d3.max(v, d => d.line), d => d.file);
  dl.append('dt').text('Average file length');
  dl.append('dd').text(Math.round(d3.mean(fileLengths, d => d[1])) + ' lines');

  dl.append('dt').text('Average line length');
  dl.append('dd').text(Math.round(d3.mean(data, d => d.length)) + ' characters');
}

function renderTooltipContent(commit) {
  document.getElementById('commit-link').href = commit.url;
  document.getElementById('commit-link').textContent = commit.id;
  document.getElementById('commit-date').textContent = commit.datetime.toLocaleDateString();
  document.getElementById('commit-time').textContent = commit.datetime.toLocaleTimeString();
  document.getElementById('commit-author').textContent = commit.author;
  document.getElementById('commit-lines').textContent = commit.totalLines;
}

function updateTooltipVisibility(show) {
  document.getElementById('commit-tooltip').hidden = !show;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

function isCommitSelected(selection, commit) {
  if (!selection) return false;
  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);
  return (
    x >= selection[0][0] && x <= selection[1][0] &&
    y >= selection[0][1] && y <= selection[1][1]
  );
}

function renderSelectionCount(selection) {
  const selected = selection ? commits.filter(c => isCommitSelected(selection, c)) : [];
  document.getElementById('selection-count').textContent =
    `${selected.length || 'No'} commits selected`;
  return selected;
}

function renderLanguageBreakdown(selection) {
    const selected = selection ? commits.filter(c => isCommitSelected(selection, c)) : [];
    const container = document.getElementById('language-breakdown');
    container.innerHTML = '';
  
    if (selected.length === 0) return;
  
    const lines = selected.flatMap(d => d.lines);
    const breakdown = d3.rollup(lines, v => v.length, d => d.type);
    const total = lines.length;
  
    for (const [lang, count] of breakdown) {
      const pct = d3.format('.1%')(count / total);
      const block = document.createElement('div');
  
      block.innerHTML = `
        <dt>${lang}</dt>
        <dd>${count} lines</dd>
        <dd>(${pct})</dd>
      `;
  
      container.appendChild(block);
    }
  }
  

function brushed(event) {
  const selection = event.selection;
  d3.selectAll('circle')
    .classed('selected', d => isCommitSelected(selection, d))
    .classed('not-selected', d => selection && !isCommitSelected(selection, d));
  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

function renderScatterPlot(commits) {
  const width = 1200;
  const height = 700;
  const margin = { top: 20, right: 40, bottom: 50, left: 60 };

  const usableArea = {
    left: margin.left,
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  const svg = d3.select('#chart')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('overflow', 'visible');

  xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3.scaleLinear().domain([0, 24]).range([usableArea.bottom, usableArea.top]);

  svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  svg.append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(d3.axisBottom(xScale));

  svg.append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(d3.axisLeft(yScale).tickFormat(d => `${String(d).padStart(2, '0')}:00`));

  svg.call(d3.brush().extent([[usableArea.left, usableArea.top], [usableArea.right, usableArea.bottom]]).on('start brush end', brushed));

  const validCommits = commits.filter(d => d.datetime instanceof Date && !isNaN(d.datetime));
  const [minLines, maxLines] = d3.extent(validCommits, d => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const dots = svg.append('g').attr('class', 'dots');
  dots.selectAll('circle')
    .data(d3.sort(validCommits, d => -d.totalLines))
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .attr('fill', '#4682b4')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
}

// MAIN
const rawData = await loadData();
commits = processCommits(rawData);
renderCommitInfo(rawData, commits);
renderScatterPlot(commits);
