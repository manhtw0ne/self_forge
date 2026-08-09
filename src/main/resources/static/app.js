const state = {
    token: localStorage.getItem("selfforge.token"),
    user: null,
    view: "dashboard",
    habits: [],
    categories: [],
    challenges: []
};

const textMap = new Map([
    ["Day som truoc 6:00", "Dậy sớm trước 6:00"],
    ["Giu loi hua dau tien trong ngay", "Giữ lời hứa đầu tiên trong ngày"],
    ["Doc sach 20 phut", "Đọc sách 20 phút"],
    ["Doc it nhat 10 trang hoac 20 phut", "Đọc ít nhất 10 trang hoặc 20 phút"],
    ["Tap luyen", "Tập luyện"],
    ["Tap gym, chay bo, hoac workout tai nha", "Tập gym, chạy bộ, hoặc workout tại nhà"],
    ["Suc khoe", "Sức khỏe"],
    ["Hoc tap", "Học tập"],
    ["Cong viec", "Công việc"],
    ["Tinh than", "Tinh thần"],
    ["Tai chinh", "Tài chính"],
    ["Xa hoi", "Xã hội"],
    ["Khoi dau", "Khởi đầu"],
    ["Hoan thanh check-in dau tien", "Hoàn thành check-in đầu tiên"],
    ["Mot tuan kien dinh", "Một tuần kiên định"],
    ["Hinh thanh thoi quen", "Hình thành thói quen"],
    ["Mot thang bat bai", "Một tháng bất bại"],
    ["Chien binh ky luat", "Chiến binh kỷ luật"],
    ["Huyen thoai", "Huyền thoại"],
    ["Tuan hoan hao", "Tuần hoàn hảo"],
    ["10 buoc dau", "10 bước đầu"],
    ["Nua tram", "Nửa trăm"],
    ["Bach chien bach thang", "Bách chiến bách thắng"],
    ["Nua nghin", "Nửa nghìn"],
    ["Nghin check-in", "Nghìn check-in"]
]);

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function vi(value) {
    if (value === null || value === undefined) return "";
    return textMap.get(String(value)) || String(value);
}

function setStatus(message) {
    $("#appStatus").textContent = message;
}

async function api(path, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };
    if (state.token) headers.Authorization = `Bearer ${state.token}`;
    const response = await fetch(path, { ...options, headers });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Lỗi ${response.status}`);
    }
    if (response.status === 204) return null;
    return response.json();
}

async function login(register = false) {
    const email = $("#emailInput").value.trim();
    const password = $("#passwordInput").value;
    const displayName = email.split("@")[0] || "Người dùng";
    const body = register ? { email, password, displayName } : { email, password };
    const data = await api(register ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        body: JSON.stringify(body)
    });
    state.token = data.token;
    localStorage.setItem("selfforge.token", state.token);
    state.user = data.user;
    setStatus(register ? "Đã tạo tài khoản" : "Đã đăng nhập");
    await bootstrap();
}

function logout() {
    localStorage.removeItem("selfforge.token");
    state.token = null;
    state.user = null;
    $("#authPanel").classList.remove("hidden");
    $("#profilePanel").classList.add("hidden");
    clearViews();
    setStatus("Đã đăng xuất");
}

async function bootstrap() {
    if (!state.token) {
        $("#authPanel").classList.remove("hidden");
        $("#profilePanel").classList.add("hidden");
        clearViews();
        return;
    }
    try {
        state.user = await api("/api/auth/me");
        $("#profileName").textContent = state.user.displayName;
        $("#profileEmail").textContent = state.user.email;
        $("#authPanel").classList.add("hidden");
        $("#profilePanel").classList.remove("hidden");
        await loadSharedData();
        await renderCurrentView();
    } catch (error) {
        logout();
        setStatus("Phiên đăng nhập đã hết hạn");
    }
}

function clearViews() {
    $("#dashboardHabits").innerHTML = "";
    $("#habitList").innerHTML = "";
    $("#challengeList").innerHTML = "";
    $("#achievementList").innerHTML = "";
}

async function loadSharedData() {
    const [habits, categories] = await Promise.all([
        api("/api/habits"),
        api("/api/categories").catch(() => [])
    ]);
    state.habits = habits;
    state.categories = categories;
    fillSelects();
}

function fillSelects() {
    $("#habitCategory").innerHTML = `<option value="">Không chọn</option>` + state.categories
        .map((category) => `<option value="${category.id}">${vi(category.name)}</option>`)
        .join("");
    $("#challengeHabit").innerHTML = state.habits
        .map((habit) => `<option value="${habit.id}">${vi(habit.name)}</option>`)
        .join("");
}

async function renderCurrentView() {
    const title = {
        dashboard: "Bảng điều khiển",
        habits: "Thói quen",
        challenges: "Thử thách",
        rewards: "Huy hiệu",
        journal: "Nhật ký"
    }[state.view];
    $("#viewTitle").textContent = title;
    $$(".view").forEach((view) => view.classList.add("hidden"));
    $(`#${state.view}View`).classList.remove("hidden");

    if (state.view === "dashboard") await renderDashboard();
    if (state.view === "habits") await renderHabits();
    if (state.view === "challenges") await renderChallenges();
    if (state.view === "rewards") await renderRewards();
}

async function renderDashboard() {
    const data = await api("/api/dashboard/today");
    $("#todayScore").textContent = data.todayScore;
    $("#weekScore").textContent = data.weekScore;
    $("#weekRate").textContent = `${Math.round(data.weekCompletionRate * 100)}%`;
    $("#habitCount").textContent = data.activeHabitCount;
    $("#dashboardHabits").innerHTML = data.habits.map(renderHabitProgress).join("") || empty("Chưa có thói quen nào");
}

function renderHabitProgress(habit) {
    const status = habit.todayStatus ? statusLabel(habit.todayStatus) : "Chưa check-in";
    return `
        <article class="item-card">
            <div>
                <h3>${vi(habit.name)}</h3>
                <span class="meta">${difficultyLabel(habit.difficulty)} · ${habit.points} điểm · streak ${habit.currentStreak} ngày · ${status}</span>
            </div>
            <div class="item-actions">
                <button data-kind="completed" onclick="checkIn(${habit.habitId}, 'COMPLETED')">Hoàn thành</button>
                <button onclick="checkIn(${habit.habitId}, 'SKIPPED')">Bỏ qua</button>
                <button data-kind="failed" onclick="checkIn(${habit.habitId}, 'FAILED')">Thất bại</button>
            </div>
        </article>
    `;
}

async function renderHabits() {
    state.habits = await api("/api/habits");
    fillSelects();
    $("#habitList").innerHTML = state.habits.map((habit) => `
        <article class="item-card">
            <div>
                <h3>${vi(habit.name)}</h3>
                <span class="meta">${vi(habit.description)} ${habit.categoryName ? `· ${vi(habit.categoryName)}` : ""}</span>
            </div>
            <div class="item-actions">
                <button data-kind="completed" onclick="checkIn(${habit.id}, 'COMPLETED')">Hoàn thành</button>
                <button onclick="checkIn(${habit.id}, 'SKIPPED')">Bỏ qua</button>
                <button data-kind="failed" onclick="checkIn(${habit.id}, 'FAILED')">Thất bại</button>
            </div>
        </article>
    `).join("") || empty("Chưa có thói quen nào");
}

async function renderChallenges() {
    await loadSharedData();
    const challenges = await api("/api/challenges");
    const progressList = await Promise.all(challenges.map((challenge) =>
        api(`/api/challenges/${challenge.id}/progress`).catch(() => null)
    ));
    $("#challengeList").innerHTML = challenges.map((challenge, index) => {
        const progress = progressList[index];
        const rate = progress ? Math.round(progress.completionRate * 100) : 0;
        return `
            <article class="item-card">
                <div>
                    <h3>${vi(challenge.name)}</h3>
                    <span class="meta">${vi(challenge.habitName)} · ${challenge.targetDays} ngày · ${statusLabel(challenge.status)}</span>
                    <div class="progress-track"><div class="progress-bar" style="width:${rate}%"></div></div>
                </div>
                <div class="item-actions">
                    <span class="meta">${progress ? `${progress.completedDays}/${progress.targetDays} ngày` : "0 ngày"}</span>
                </div>
            </article>
        `;
    }).join("") || empty("Chưa có thử thách nào");
}

async function renderRewards() {
    const [progress, achievements] = await Promise.all([
        api("/api/rewards/progress").catch(() => null),
        api("/api/rewards/achievements").catch(() => [])
    ]);
    if (progress) {
        $("#levelValue").textContent = progress.level;
        $("#xpValue").textContent = progress.totalXp;
        $("#levelProgress").style.width = `${Math.round(progress.levelProgress * 100)}%`;
    }
    $("#achievementList").innerHTML = achievements.map((item) => `
        <article class="item-card badge ${item.earned ? "earned" : ""}">
            <div>
                <h3>${item.iconEmoji || "•"} ${vi(item.name)}</h3>
                <span class="meta">${vi(item.description)} · ${item.xpReward} XP</span>
            </div>
        </article>
    `).join("") || empty("Chưa có huy hiệu nào");
}

async function checkIn(habitId, status) {
    await api("/api/check-ins", {
        method: "POST",
        body: JSON.stringify({ habitId, status, note: statusLabel(status) })
    });
    setStatus(statusLabel(status));
    await loadSharedData();
    await renderCurrentView();
}

async function createHabit(event) {
    event.preventDefault();
    const payload = {
        name: $("#habitName").value.trim(),
        difficulty: $("#habitDifficulty").value,
        targetPerWeek: Number($("#habitTarget").value),
        categoryId: $("#habitCategory").value ? Number($("#habitCategory").value) : null
    };
    await api("/api/habits", { method: "POST", body: JSON.stringify(payload) });
    event.target.reset();
    $("#habitTarget").value = 5;
    setStatus("Đã thêm thói quen");
    await loadSharedData();
    await renderHabits();
}

async function createChallenge(event) {
    event.preventDefault();
    const payload = {
        habitId: Number($("#challengeHabit").value),
        name: $("#challengeName").value.trim(),
        targetDays: Number($("#challengeDays").value)
    };
    await api("/api/challenges", { method: "POST", body: JSON.stringify(payload) });
    event.target.reset();
    setStatus("Đã bắt đầu thử thách");
    await renderChallenges();
}

async function saveJournal(event) {
    event.preventDefault();
    await api("/api/journal", {
        method: "POST",
        body: JSON.stringify({
            win: $("#journalWin").value,
            obstacle: $("#journalObstacle").value,
            lesson: $("#journalLesson").value,
            tomorrowFocus: $("#journalFocus").value
        })
    });
    setStatus("Đã lưu nhật ký");
}

function statusLabel(status) {
    return {
        COMPLETED: "Hoàn thành",
        SKIPPED: "Bỏ qua",
        FAILED: "Thất bại",
        ACTIVE: "Đang thực hiện",
        ABANDONED: "Đã dừng"
    }[status] || status;
}

function difficultyLabel(difficulty) {
    return {
        EASY: "Dễ",
        MEDIUM: "Vừa",
        HARD: "Khó"
    }[difficulty] || difficulty;
}

function empty(message) {
    return `<article class="item-card"><div><h3>${message}</h3><span class="meta">Bắt đầu bằng cách thêm một thói quen nhỏ.</span></div></article>`;
}

function bindEvents() {
    $("#loginButton").addEventListener("click", () => login(false).catch((error) => setStatus(error.message)));
    $("#registerButton").addEventListener("click", () => login(true).catch((error) => setStatus(error.message)));
    $("#logoutButton").addEventListener("click", logout);
    $("#refreshButton").addEventListener("click", () => bootstrap().catch((error) => setStatus(error.message)));
    $("#habitForm").addEventListener("submit", (event) => createHabit(event).catch((error) => setStatus(error.message)));
    $("#challengeForm").addEventListener("submit", (event) => createChallenge(event).catch((error) => setStatus(error.message)));
    $("#journalForm").addEventListener("submit", (event) => saveJournal(event).catch((error) => setStatus(error.message)));
    $$(".nav-item").forEach((button) => {
        button.addEventListener("click", async () => {
            $$(".nav-item").forEach((item) => item.classList.remove("active"));
            button.classList.add("active");
            state.view = button.dataset.view;
            await renderCurrentView().catch((error) => setStatus(error.message));
        });
    });
}

bindEvents();
bootstrap();
