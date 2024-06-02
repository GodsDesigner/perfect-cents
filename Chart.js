document.addEventListener('DOMContentLoaded', () => {
    const budgetForm = document.getElementById('budget-form');
    const expenseForm = document.getElementById('expense-form');
    const billForm = document.getElementById('bill-form');
    const savingsGoalForm = document.getElementById('savings-goal-form');
    const expensesList = document.getElementById('expenses-list');
    const savingsGoalsList = document.getElementById('savings-goals-list');
    const totalExpensesElement = document.getElementById('total-expenses');
    const remainingBalanceElement = document.getElementById('remaining-balance');
    const dailyBudgetDisplay = document.getElementById('daily-budget-display');
    const monthlyBudgetDisplay = document.getElementById('monthly-budget-display');
    const remainingMonthlyBalanceElement = document.getElementById('remaining-monthly-balance');
    const weeklySummaryElement = document.getElementById('weekly-summary');
    const monthlySummaryElement = document.getElementById('monthly-summary');
    const calendarEl = $('#calendar');
    const spendingChartCtx = document.getElementById('spending-chart').getContext('2d');
    const categoryChartCtx = document.getElementById('category-chart').getContext('2d');

    let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    let bills = JSON.parse(localStorage.getItem('bills')) || [];
    let savingsGoals = JSON.parse(localStorage.getItem('savingsGoals')) || [];
    let dailyBudget = parseFloat(localStorage.getItem('dailyBudget')) || 0;
    let monthlyBudget = parseFloat(localStorage.getItem('monthlyBudget')) || 0;
    let categoryBudgets = JSON.parse(localStorage.getItem('categoryBudgets')) || {};
    let totalExpenses = expenses.reduce((acc, expense) => acc + expense.amount, 0);

    dailyBudgetDisplay.textContent = dailyBudget.toFixed(2);
    monthlyBudgetDisplay.textContent = monthlyBudget.toFixed(2);
    updateRemainingBalance();
    updateRemainingMonthlyBalance();
    updateSummaries();
    checkForUpcomingBills();
    initializeCategoryBudgets();
    initializeCharts();

    // Request Notification Permission
    if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }

    budgetForm.addEventListener('submit', function(e) {
        e.preventDefault();
        dailyBudget = parseFloat(document.getElementById('daily-budget-input').value);
        localStorage.setItem('dailyBudget', dailyBudget);
        dailyBudgetDisplay.textContent = dailyBudget.toFixed(2);
        updateRemainingBalance();
        budgetForm.reset();
    });

    expenseForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const date = document.getElementById('date').value;
        const description = document.getElementById('description').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const recurring = document.getElementById('recurring').value;

        if (!date || !description || isNaN(amount) || !category) {
            alert('Please fill out all fields correctly.');
            return;
        }

        const expense = { date, description, amount, category, recurring };

        expenses.push(expense);
        totalExpenses += amount;
        localStorage.setItem('expenses', JSON.stringify(expenses));
        addExpenseToTable(expense);
        updateTotalExpenses();
        updateRemainingBalance();
        updateCategorySpending(category, amount);
        updateCharts();

        expenseForm.reset();
    });

    billForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const monthlyBudgetInput = parseFloat(document.getElementById('monthly-budget').value);
        const date = document.getElementById('bill-date').value;
        const description = document.getElementById('bill-description').value;
        const amount = parseFloat(document.getElementById('bill-amount').value);

        if (!date || !description || isNaN(amount) || isNaN(monthlyBudgetInput)) {
            alert('Please fill out all fields correctly.');
            return;
        }

        if (!monthlyBudget) {
            monthlyBudget = monthlyBudgetInput;
            localStorage.setItem('monthlyBudget', monthlyBudget);
            monthlyBudgetDisplay.textContent = monthlyBudget.toFixed(2);
        }

        const bill = { date, description, amount };

        bills.push(bill);
        localStorage.setItem('bills', JSON.stringify(bills));
        addBillToCalendar(bill);
        updateRemainingMonthlyBalance();
        checkForUpcomingBills();

        billForm.reset();
    });

    savingsGoalForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const description = document.getElementById('goal-description').value;
        const amount = parseFloat(document.getElementById('goal-amount').value);
        const date = document.getElementById('goal-date').value;

        if (!description || isNaN(amount) || !date) {
            alert('Please fill out all fields correctly.');
            return;
        }

        const goal = { description, amount, date, progress: 0 };

        savingsGoals.push(goal);
        localStorage.setItem('savingsGoals', JSON.stringify(savingsGoals));
        addSavingsGoalToTable(goal);
        updateSummaries();

        savingsGoalForm.reset();
    });

    function addExpenseToTable(expense) {
        const expenseRow = document.createElement('tr');
        expenseRow.innerHTML = `
            <td class="border px-4 py-2">${expense.date}</td>
            <td class="border px-4 py-2">${expense.description}</td>
            <td class="border px-4 py-2">$${expense.amount.toFixed(2)}</td>
            <td class="border px-4 py-2">${expense.category}</td>
            <td class="border px-4 py-2">${expense.recurring}</td>
        `;
        expensesList.appendChild(expenseRow);
    }

    function addSavingsGoalToTable(goal) {
        const goalRow = document.createElement('tr');
        goalRow.innerHTML = `
            <td class="border px-4 py-2">${goal.description}</td>
            <td class="border px-4 py-2">$${goal.amount.toFixed(2)}</td>
            <td class="border px-4 py-2">${goal.date}</td>
            <td class="border px-4 py-2">${goal.progress}%</td>
        `;
        savingsGoalsList.appendChild(goalRow);
    }

    function updateTotalExpenses() {
        totalExpensesElement.textContent = totalExpenses.toFixed(2);
    }

    function updateRemainingBalance() {
        const remainingBalance = dailyBudget - totalExpenses;
        remainingBalanceElement.textContent = remainingBalance.toFixed(2);
    }

    function updateRemainingMonthlyBalance() {
        const totalBills = bills.reduce((acc, bill) => acc + bill.amount, 0);
        const remainingMonthlyBalance = monthlyBudget - totalBills;
        remainingMonthlyBalanceElement.textContent = remainingMonthlyBalance.toFixed(2);
    }

    function addBillToCalendar(bill) {
        calendarEl.fullCalendar('renderEvent', {
            title: `${bill.description}: $${bill.amount.toFixed(2)}`,
            start: bill.date,
            allDay: true
        }, true);
    }

    function checkForUpcomingBills() {
        const today = moment().startOf('day');
        const upcomingBills = bills.filter(bill => {
            const billDate = moment(bill.date);
            return billDate.diff(today, 'days') <= 7 && billDate.isAfter(today);
        });

        upcomingBills.forEach(bill => {
            const daysUntilDue = moment(bill.date).diff(today, 'days');
            showNotification(`Upcoming Bill: ${bill.description}`, `Amount: $${bill.amount.toFixed(2)} is due in ${daysUntilDue} day(s).`);
        });
    }

    function showNotification(title, body) {
        if (Notification.permission === 'granted') {
            new Notification(title, { body });
        }
    }

    function initializeCategoryBudgets() {
        const categories = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Other'];
        categories.forEach(category => {
            if (!categoryBudgets[category]) {
                categoryBudgets[category] = {
                    budget: 0,
                    spent: 0
                };
            }
        });
        localStorage.setItem('categoryBudgets', JSON.stringify(categoryBudgets));
    }

    function updateCategorySpending(category, amount) {
        if (categoryBudgets[category]) {
            categoryBudgets[category].spent += amount;
            localStorage.setItem('categoryBudgets', JSON.stringify(categoryBudgets));
        }
    }

    function updateSummaries() {
        const today = moment();
        const startOfWeek = moment().startOf('week');
        const startOfMonth = moment().startOf('month');

        const weeklyExpenses = expenses.filter(expense => moment(expense.date).isBetween(startOfWeek, today, null, '[]'))
            .reduce((acc, expense) => acc + expense.amount, 0);

        const monthlyExpenses = expenses.filter(expense => moment(expense.date).isBetween(startOfMonth, today, null, '[]'))
            .reduce((acc, expense) => acc + expense.amount, 0);

        weeklySummaryElement.textContent = weeklyExpenses.toFixed(2);
        monthlySummaryElement.textContent = monthlyExpenses.toFixed(2);
    }

    function initializeCharts() {
        const spendingChart = new Chart(spendingChartCtx, {
            type: 'line',
            data: {
                labels: expenses.map(expense => expense.date),
                datasets: [{
                    label: 'Spending Over Time',
                    data: expenses.map(expense => expense.amount),
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    xAxes: [{
                        type: 'time',
                        time: {
                            unit: 'day'
                        },
                        distribution: 'linear'
                    }],
                    yAxes: [{
                        ticks: {
                            beginAtZero: true
                        }
                    }]
                }
            }
        });

        const categoryChart = new Chart(categoryChartCtx, {
            type: 'pie',
            data: {
                labels: Object.keys(categoryBudgets),
                datasets: [{
                    label: 'Spending by Category',
                    data: Object.values(categoryBudgets).map(budget => budget.spent),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.2)',
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(255, 206, 86, 0.2)',
                        'rgba(75, 192, 192, 0.2)',
                        'rgba(153, 102, 255, 0.2)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true
            }
        });

        updateCharts = () => {
            spendingChart.data.labels = expenses.map(expense => expense.date);
            spendingChart.data.datasets[0].data = expenses.map(expense => expense.amount);
            spendingChart.update();

            categoryChart.data.datasets[0].data = Object.values(categoryBudgets).map(budget => budget.spent);
            categoryChart.update();
        };
    }

    const tabs = document.querySelectorAll('.tab-content');
    const tabButtons = document.querySelectorAll('[id$="-tab-btn"]');

    tabButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = button.href.split('#')[1];
            tabs.forEach(tab => {
                tab.classList.add('hidden');
            });
            document.getElementById(targetId).classList.remove('hidden');
        });
    });

    calendarEl.fullCalendar({
        header: {
            left: 'prev,next today',
            center: 'title',
            right: 'month,agendaWeek,agendaDay'
        },
        editable: true,
        droppable: true,
        events: bills.map(bill => ({
            title: `${bill.description}: $${bill.amount.toFixed(2)}`,
            start: bill.date,
            allDay: true
        }))
    });

    // Initial population of data
    expenses.forEach(addExpenseToTable);
    savingsGoals.forEach(addSavingsGoalToTable);
    updateTotalExpenses();
    updateCharts();
});
