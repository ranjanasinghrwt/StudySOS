(() => {
    "use strict";

    const STORAGE_KEY = "studysos-dashboard-v1";
    const $ = selector => document.querySelector(selector);
    const ui = {
        saveStatus: $("#save-status"),
        examForm: $("#exam-form"),
        examDate: $("#exam-date"),
        countdown: $("#countdown-timer"),
        daysRemaining: $("#days-remaining"),
        examOverviewLabel: $("#exam-overview-label"),
        clearExam: $("#clear-exam"),
        subjectForm: $("#subject-form"),
        subjectInput: $("#subject-input"),
        subjectList: $("#subject-list"),
        subjectsTotal: $("#subjects-total"),
        topicsTotal: $("#topics-total"),
        topicForm: $("#topic-form"),
        topicInput: $("#topic-input"),
        topicSubject: $("#topic-subject"),
        topicList: $("#topic-list"),
        topicCount: $("#topic-count"),
        emptyTopics: $("#empty-topics"),
        progressBar: $("#progress-bar"),
        progressFill: $("#progress-fill"),
        progressPercentage: $("#progress-percentage"),
        overviewProgress: $("#overview-progress"),
        progressSummary: $("#progress-summary"),
        subjectProgress: $("#subject-progress"),
        sosToggle: $("#sos-toggle"),
        heroSos: $("#hero-sos"),
        urgentTopics: $("#urgent-topics")
    };

    function makeId() {
        return window.crypto?.randomUUID?.() ||
            `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function loadState() {
        const empty = { examDate: "", sosMode: false, selectedSubjectId: "", subjects: [] };
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (!saved || !Array.isArray(saved.subjects)) return empty;
            return {
                examDate: typeof saved.examDate === "string" ? saved.examDate : "",
                sosMode: Boolean(saved.sosMode),
                selectedSubjectId: typeof saved.selectedSubjectId === "string" ? saved.selectedSubjectId : "",
                subjects: saved.subjects
                    .filter(subject => subject && typeof subject.name === "string")
                    .map(subject => ({
                        id: String(subject.id || makeId()),
                        name: subject.name,
                        topics: Array.isArray(subject.topics)
                            ? subject.topics.filter(topic => topic && typeof topic.name === "string")
                                .map(topic => ({
                                    id: String(topic.id || makeId()),
                                    name: topic.name,
                                    completed: Boolean(topic.completed),
                                    priority: Boolean(topic.priority)
                                }))
                            : []
                    }))
            };
        } catch (error) {
            console.warn("Could not load StudySOS data:", error);
            return empty;
        }
    }

    const state = loadState();

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            ui.saveStatus.textContent = "Saved on this device";
        } catch (error) {
            ui.saveStatus.textContent = "Could not save changes";
            console.warn("Could not save StudySOS data:", error);
        }
    }

    function makeElement(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function findSubject(id) {
        return state.subjects.find(subject => subject.id === id);
    }

    function allTopics() {
        return state.subjects.flatMap(subject =>
            subject.topics.map(topic => ({ ...topic, subjectId: subject.id, subjectName: subject.name }))
        );
    }

    function renderSubjects() {
        ui.subjectList.replaceChildren();
        state.subjects.forEach(subject => {
            const item = makeElement("li", `subject-chip${subject.id === state.selectedSubjectId ? " selected" : ""}`);
            const select = makeElement("button", "subject-select", subject.name);
            select.type = "button";
            select.dataset.selectSubject = subject.id;
            select.setAttribute("aria-pressed", String(subject.id === state.selectedSubjectId));

            const remove = makeElement("button", "subject-delete", "×");
            remove.type = "button";
            remove.dataset.deleteSubject = subject.id;
            remove.setAttribute("aria-label", `Delete ${subject.name}`);

            item.append(select, remove);
            ui.subjectList.append(item);
        });
    }

    function renderSubjectOptions() {
        const previousValue = ui.topicSubject.value;
        ui.topicSubject.replaceChildren();

        if (!state.subjects.length) {
            ui.topicSubject.add(new Option("Add a subject first", ""));
            ui.topicSubject.disabled = true;
            $("#add-topic").disabled = true;
            return;
        }

        ui.topicSubject.disabled = false;
        $("#add-topic").disabled = false;
        state.subjects.forEach(subject => ui.topicSubject.add(new Option(subject.name, subject.id)));

        const preferred = findSubject(state.selectedSubjectId) ? state.selectedSubjectId : previousValue;
        ui.topicSubject.value = findSubject(preferred) ? preferred : state.subjects[0].id;
    }

    function renderTopics() {
        ui.topicList.replaceChildren();
        const subject = findSubject(state.selectedSubjectId);
        const topics = subject ? subject.topics : [];

        ui.topicCount.textContent = `${topics.length} ${topics.length === 1 ? "topic" : "topics"}`;
        ui.emptyTopics.hidden = topics.length > 0;
        ui.emptyTopics.textContent = !state.subjects.length
            ? "Add a subject, then add your first topic."
            : subject ? "No topics yet. Add one above." : "Choose a subject to view its topics.";

        topics.forEach(topic => {
            const item = makeElement("li", `topic-item${topic.completed ? " completed" : ""}`);

            const checkbox = makeElement("input", "topic-check");
            checkbox.type = "checkbox";
            checkbox.checked = topic.completed;
            checkbox.dataset.completeTopic = topic.id;
            checkbox.setAttribute("aria-label", `Mark ${topic.name} complete`);

            const name = makeElement("span", "topic-name", topic.name);
            name.append(makeElement("small", "topic-subject", subject.name));

            const priority = makeElement("button", `priority-button${topic.priority ? " active" : ""}`,
                topic.priority ? "★ Priority" : "☆ Priority");
            priority.type = "button";
            priority.dataset.togglePriority = topic.id;
            priority.setAttribute("aria-pressed", String(topic.priority));

            const remove = makeElement("button", "topic-delete", "×");
            remove.type = "button";
            remove.dataset.deleteTopic = topic.id;
            remove.setAttribute("aria-label", `Delete ${topic.name}`);

            item.append(checkbox, name, priority, remove);
            ui.topicList.append(item);
        });
    }

    function renderProgress() {
        const topics = allTopics();
        const completed = topics.filter(topic => topic.completed).length;
        const percentage = topics.length ? Math.round(completed / topics.length * 100) : 0;

        ui.progressPercentage.textContent = `${percentage}%`;
        ui.overviewProgress.textContent = `${percentage}%`;
        ui.progressFill.style.width = `${percentage}%`;
        ui.progressBar.setAttribute("aria-valuenow", String(percentage));
        ui.progressSummary.textContent = topics.length
            ? `${completed} of ${topics.length} ${topics.length === 1 ? "topic" : "topics"} completed`
            : "Add topics to start tracking your progress.";

        ui.subjectProgress.replaceChildren();
        state.subjects.forEach(subject => {
            if (!subject.topics.length) return;
            const done = subject.topics.filter(topic => topic.completed).length;
            const row = makeElement("li");
            row.append(
                makeElement("span", "", subject.name),
                makeElement("strong", "", `${done}/${subject.topics.length}`)
            );
            ui.subjectProgress.append(row);
        });
    }

    function renderOverview() {
        const topics = allTopics();
        ui.subjectsTotal.textContent = String(state.subjects.length);
        ui.topicsTotal.textContent = `${topics.length} ${topics.length === 1 ? "topic" : "topics"} to revise`;
    }

    function renderSOS() {
        ui.sosToggle.setAttribute("aria-pressed", String(state.sosMode));
        ui.sosToggle.textContent = state.sosMode ? "Disable SOS mode" : "Enable SOS mode";
        ui.sosToggle.classList.toggle("active", state.sosMode);
        ui.urgentTopics.replaceChildren();

        if (!state.sosMode) {
            ui.urgentTopics.append(makeElement("li", "sos-empty", "Enable SOS mode to see your focus list."));
            return;
        }

        const remaining = allTopics()
            .filter(topic => !topic.completed)
            .sort((a, b) => Number(b.priority) - Number(a.priority));

        if (!remaining.length) {
            ui.urgentTopics.append(makeElement("li", "sos-empty", "You’re all caught up. Nice work!"));
            return;
        }

        remaining.forEach(topic => {
            const item = makeElement("li", "urgent-item");
            item.append(makeElement("span", "urgent-marker", topic.priority ? "★" : "•"));

            const details = makeElement("span", "urgent-text", topic.name);
            details.append(makeElement("small", "", topic.priority
                ? `${topic.subjectName} · Priority`
                : topic.subjectName));

            const done = makeElement("button", "urgent-done", "Done");
            done.type = "button";
            done.dataset.completeUrgent = topic.id;
            done.dataset.subjectId = topic.subjectId;
            done.setAttribute("aria-label", `Mark ${topic.name} complete`);

            item.append(details, done);
            ui.urgentTopics.append(item);
        });
    }

    function renderCountdown() {
        if (!state.examDate) {
            ui.countdown.textContent = "Set an exam date to start your countdown.";
            ui.daysRemaining.textContent = "—";
            ui.examOverviewLabel.textContent = "Set a date to begin your countdown";
            return;
        }

        const examTime = new Date(state.examDate).getTime();
        if (!Number.isFinite(examTime)) {
            ui.countdown.textContent = "That exam date is invalid. Please choose another.";
            ui.daysRemaining.textContent = "—";
            ui.examOverviewLabel.textContent = "Check your exam date";
            return;
        }

        const difference = examTime - Date.now();
        if (difference <= 0) {
            ui.countdown.textContent = "Your exam time has arrived.";
            ui.daysRemaining.textContent = "0";
            ui.examOverviewLabel.textContent = "Your exam is here";
            return;
        }

        const seconds = Math.floor(difference / 1000);
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;

        ui.daysRemaining.textContent = String(days);
        ui.examOverviewLabel.textContent = `${days === 1 ? "day" : "days"} until your exam`;
        ui.countdown.replaceChildren(
            makeElement("strong", "", `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`),
            document.createTextNode(" until your exam")
        );
    }

    function render() {
        renderSubjects();
        renderSubjectOptions();
        renderTopics();
        renderProgress();
        renderOverview();
        renderSOS();
    }

    ui.examDate.value = state.examDate;
    ui.examForm.addEventListener("submit", event => {
        event.preventDefault();
        if (!ui.examDate.value) {
            ui.examDate.focus();
            return;
        }
        state.examDate = ui.examDate.value;
        saveState();
        renderCountdown();
    });

    ui.clearExam.addEventListener("click", () => {
        state.examDate = "";
        ui.examDate.value = "";
        saveState();
        renderCountdown();
    });

    ui.subjectForm.addEventListener("submit", event => {
        event.preventDefault();
        const name = ui.subjectInput.value.trim();
        if (!name) return;
        const subject = { id: makeId(), name, topics: [] };
        state.subjects.push(subject);
        state.selectedSubjectId = subject.id;
        ui.subjectInput.value = "";
        saveState();
        render();
        ui.subjectInput.focus();
    });

    ui.subjectList.addEventListener("click", event => {
        const select = event.target.closest("[data-select-subject]");
        if (select) {
            state.selectedSubjectId = select.dataset.selectSubject;
            saveState();
            render();
            return;
        }

        const remove = event.target.closest("[data-delete-subject]");
        if (!remove) return;
        const subject = findSubject(remove.dataset.deleteSubject);
        if (!subject || !window.confirm(`Delete "${subject.name}" and all its topics?`)) return;

        state.subjects = state.subjects.filter(item => item.id !== subject.id);
        if (state.selectedSubjectId === subject.id) {
            state.selectedSubjectId = state.subjects[0]?.id || "";
        }
        saveState();
        render();
    });

    ui.topicSubject.addEventListener("change", () => {
        state.selectedSubjectId = ui.topicSubject.value;
        saveState();
        render();
    });

    ui.topicForm.addEventListener("submit", event => {
        event.preventDefault();
        const name = ui.topicInput.value.trim();
        const subject = findSubject(ui.topicSubject.value);
        if (!name || !subject) return;
        subject.topics.push({ id: makeId(), name, completed: false, priority: false });
        state.selectedSubjectId = subject.id;
        ui.topicInput.value = "";
        saveState();
        render();
        ui.topicInput.focus();
    });

    ui.topicList.addEventListener("change", event => {
        const checkbox = event.target.closest("[data-complete-topic]");
        if (!checkbox) return;
        const subject = findSubject(state.selectedSubjectId);
        const topic = subject?.topics.find(item => item.id === checkbox.dataset.completeTopic);
        if (!topic) return;
        topic.completed = checkbox.checked;
        saveState();
        render();
    });

    ui.topicList.addEventListener("click", event => {
        const priority = event.target.closest("[data-toggle-priority]");
        if (priority) {
            const subject = findSubject(state.selectedSubjectId);
            const topic = subject?.topics.find(item => item.id === priority.dataset.togglePriority);
            if (!topic) return;
            topic.priority = !topic.priority;
            saveState();
            render();
            return;
        }

        const remove = event.target.closest("[data-delete-topic]");
        if (!remove) return;
        const subject = findSubject(state.selectedSubjectId);
        if (!subject) return;
        subject.topics = subject.topics.filter(topic => topic.id !== remove.dataset.deleteTopic);
        saveState();
        render();
    });

    function toggleSOS() {
        state.sosMode = !state.sosMode;
        saveState();
        renderSOS();
    }

    ui.sosToggle.addEventListener("click", toggleSOS);
    ui.heroSos.addEventListener("click", () => {
        if (!state.sosMode) toggleSOS();
    });

    ui.urgentTopics.addEventListener("click", event => {
        const button = event.target.closest("[data-complete-urgent]");
        if (!button) return;
        const subject = findSubject(button.dataset.subjectId);
        const topic = subject?.topics.find(item => item.id === button.dataset.completeUrgent);
        if (!topic) return;
        topic.completed = true;
        saveState();
        render();
    });

    if (!findSubject(state.selectedSubjectId)) {
        state.selectedSubjectId = state.subjects[0]?.id || "";
    }

    render();
    renderCountdown();
    window.setInterval(renderCountdown, 1000);
})();