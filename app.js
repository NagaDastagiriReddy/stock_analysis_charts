// Real API Call to Local Python Backend (Unlimited Free Data)
async function fetchStockDetails(symbol) {
    try {
        let querySymbol = symbol.trim().toUpperCase();

        const baseUrl = window.location.protocol === 'file:' ? 'http://localhost:5000' : '';
        const url = `${baseUrl}/api/stock?symbol=${querySymbol}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;

    } catch (e) {
        console.error("Fetch failed for " + symbol + ":", e.message);
        throw e;
    }
}

let activeCharts = [];
let currentStocksData = [];
let currentSortMode = 'default';

async function loadDashboard() {
    const inputStr = document.getElementById('stock-input').value;
    if (!inputStr.trim()) return;

    const symbols = inputStr.split(',').filter(s => s.trim().length > 0);
    const grid = document.getElementById('chart-grid');
    const loader = document.getElementById('loader');

    // UI State: Loading
    grid.innerHTML = '';
    activeCharts.forEach(chart => chart.destroy());
    activeCharts = [];
    loader.classList.remove('hidden');

    try {
        const fetchPromises = symbols.map(sym => fetchStockDetails(sym));
        const results = await Promise.allSettled(fetchPromises);
        
        const stocksData = results
            .filter(r => r.status === 'fulfilled' && !r.value.error)
            .map(r => r.value);

        // UI State: Render
        loader.classList.add('hidden');
        if (stocksData.length > 0) {
            currentStocksData = stocksData;
            applySorting();
        } else {
            grid.innerHTML = '<p style="text-align:center; color: var(--text-secondary); width:100%;">No data found. Is the Python server running?</p>';
        }
    } catch (error) {
        loader.classList.add('hidden');
        console.error("Failed to fetch stock data", error);
        grid.innerHTML = '<p style="text-align:center; color: var(--text-secondary); width:100%;">Error loading data. Is the Python backend running?</p>';
    }
}

function applySorting() {
    if (currentSortMode === 'change_desc') {
        currentStocksData.sort((a, b) => b.dailyChangePct - a.dailyChangePct);
    } else if (currentSortMode === 'change_asc') {
        currentStocksData.sort((a, b) => a.dailyChangePct - b.dailyChangePct);
    } else if (currentSortMode === 'pe_asc') {
        currentStocksData.sort((a, b) => {
            const aPE = a.peRatio === 'N/A' ? Infinity : parseFloat(a.peRatio);
            const bPE = b.peRatio === 'N/A' ? Infinity : parseFloat(b.peRatio);
            return aPE - bPE;
        });
    } else if (currentSortMode === 'pe_desc') {
        currentStocksData.sort((a, b) => {
            const aPE = a.peRatio === 'N/A' ? -Infinity : parseFloat(a.peRatio);
            const bPE = b.peRatio === 'N/A' ? -Infinity : parseFloat(b.peRatio);
            return bPE - aPE;
        });
    } else {
        // default: original fetch order
        currentStocksData.sort((a, b) => a.originalIndex - b.originalIndex);
    }
    renderCards();
    renderTable();
}

function renderCards() {
    const grid = document.getElementById('chart-grid');
    grid.innerHTML = '';
    activeCharts.forEach(chart => chart.destroy());
    activeCharts = [];

    currentStocksData.forEach((stock, index) => {
        const card = document.createElement('div');
        card.className = 'stock-card';
        card.style.setProperty('--accent-glow', `${stock.color}26`);

        const currentPrice = stock.currentPrice || stock.data[stock.data.length - 1];
        const changePct = stock.dailyChangePct || 0;
        const isPositive = changePct >= 0;
        const changeClass = isPositive ? 'positive' : 'negative';
        const changeIcon = isPositive ? '▲' : '▼';

        card.innerHTML = `
            <div class="card-header">
                <div>
                    <div class="card-title">${stock.name}</div>
                    <div class="card-symbol">${stock.symbol}</div>
                </div>
                <div style="text-align: right;">
                    <div class="card-price">₹${currentPrice}</div>
                    <div class="card-change ${changeClass}">${changeIcon} ${Math.abs(changePct)}%</div>
                </div>
            </div>
            <div class="card-metrics">
                <div class="metric-item">
                    <span class="metric-label">P/E Ratio</span>
                    <span class="metric-value">${stock.peRatio}</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">1Y Change</span>
                    <span class="metric-value ${stock.yearlyChangePct >= 0 ? 'positive' : 'negative'}">${stock.yearlyChangePct >= 0 ? '+' : ''}${stock.yearlyChangePct}%</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">52W High</span>
                    <span class="metric-value">₹${stock.high52}</span>
                </div>
                <div class="metric-item">
                    <span class="metric-label">52W Low</span>
                    <span class="metric-value">₹${stock.low52}</span>
                </div>
            </div>
            <div class="chart-container">
                <canvas id="chart-${index}"></canvas>
            </div>
        `;

        grid.appendChild(card);

        const ctx = document.getElementById(`chart-${index}`).getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 180);
        gradient.addColorStop(0, `${stock.color}4D`);
        gradient.addColorStop(1, `${stock.color}00`);

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: stock.labels,
                datasets: [{
                    label: stock.symbol,
                    data: stock.data,
                    borderColor: stock.color,
                    backgroundColor: gradient,
                    borderWidth: 1.5,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: stock.color,
                    pointBorderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index', intersect: false,
                        backgroundColor: 'rgba(11, 15, 25, 0.9)',
                        titleColor: '#94a3b8', bodyColor: '#fff',
                        bodyFont: { weight: 'bold', size: 14 },
                        titleFont: { size: 12, weight: 'normal' },
                        borderColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1,
                        padding: 12, displayColors: false,
                        callbacks: {
                            title: function(context) { return context[0].label; },
                            label: function(context) { return `₹${context.parsed.y}`; }
                        }
                    }
                },
                scales: {
                    x: { display: false },
                    y: {
                        display: false,
                        min: Math.min(...stock.data) * 0.98,
                        max: Math.max(...stock.data) * 1.02
                    }
                },
                interaction: { mode: 'nearest', axis: 'x', intersect: false }
            }
        });
        activeCharts.push(chart);
    });
}

function renderTable() {
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = '';

    currentStocksData.forEach(stock => {
        const tr = document.createElement('tr');
        
        const peRatio = stock.peRatio !== 'N/A' ? stock.peRatio : 'N/A';
        const roi = stock.roi !== 'N/A' ? stock.roi + '%' : 'N/A';
        const roe = stock.roe !== 'N/A' ? stock.roe + '%' : 'N/A';
        const divYield = stock.dividendYield !== 'N/A' ? stock.dividendYield + '%' : 'N/A';
        const bookValue = stock.bookValue !== 'N/A' ? '₹' + stock.bookValue : 'N/A';
        
        tr.innerHTML = `
            <td style="color: ${stock.color}; font-weight: 600;">${stock.symbol}</td>
            <td style="font-weight: 600;">₹${stock.currentPrice}</td>
            <td>${peRatio}</td>
            <td>${stock.faceValue}</td>
            <td>${roi}</td>
            <td>${stock.roce}</td>
            <td>${roe}</td>
            <td>${divYield}</td>
            <td>${bookValue}</td>
            <td>₹${stock.high52}</td>
            <td>₹${stock.low52}</td>
        `;
        tableBody.appendChild(tr);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('fetch-btn').addEventListener('click', loadDashboard);
    
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentSortMode = this.dataset.sort;
            applySorting();
        });
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const targetId = this.dataset.target;
            document.getElementById('chart-grid').classList.add('hidden');
            document.getElementById('table-view').classList.add('hidden');
            document.getElementById(targetId).classList.remove('hidden');
        });
    });
    
    document.getElementById('stock-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') loadDashboard();
    });

    document.getElementById('file-upload').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(evt) {
            const content = evt.target.result;
            // Parse by newlines, commas, or tabs, filter empty
            const symbols = content.split(/[\n,\t]+/).map(s => s.trim()).filter(s => s.length > 0);
            
            if (symbols.length > 0) {
                document.getElementById('stock-input').value = symbols.join(', ');
                loadDashboard();
            }
        };
        reader.readAsText(file);
        
        // Reset value so the same file can trigger change event again
        e.target.value = '';
    });

    setTimeout(loadDashboard, 1500); 
});
