"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
exports.stopServer = stopServer;
const express_1 = __importDefault(require("express"));
const ws_1 = require("ws");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let server = null;
let wss = null;
const clients = new Set();
const EVENT_FILE = 'events.jsonl';
const ORG_CHART_FILE = 'org-chart.json';
const DATA_FILE = 'data.json';
const store = {
    company: null,
    departments: {},
    agents: {},
    projects: {},
    milestones: {},
    goals: {},
    tasks: {},
    day: 1,
    day_started_at: new Date().toISOString(),
};
function startServer(port) {
    return new Promise((resolve) => {
        const app = (0, express_1.default)();
        app.use(express_1.default.json());
        // CORS for development
        app.use((_req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Content-Type');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            next();
        });
        app.options('*', (_req, res) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Content-Type');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.sendStatus(204);
        });
        // Load existing data
        loadData();
        // Serve index.html at root
        app.get('/', (_req, res) => {
            const jobworldDir = getJobworldDir();
            if (!jobworldDir) {
                return res.status(500).send('JOBWORLD_DIR not set');
            }
            res.sendFile(path.join(jobworldDir, 'index.html'));
        });
        // Routes
        app.get('/api/health', (_req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });
        app.get('/api/events', (_req, res) => {
            const jobworldDir = getJobworldDir();
            if (!jobworldDir) {
                return res.json([]);
            }
            const eventPath = path.join(jobworldDir, 'event-stream', EVENT_FILE);
            if (!fs.existsSync(eventPath)) {
                return res.json([]);
            }
            const content = fs.readFileSync(eventPath, 'utf-8');
            const events = content.split('\n').filter(Boolean).map(line => {
                try {
                    return JSON.parse(line);
                }
                catch {
                    return null;
                }
            }).filter(Boolean);
            res.json(events);
        });
        app.get('/api/org-chart', (_req, res) => {
            // Build project color map first: projectId → colorIdx
            const projectColorMap = {};
            Object.values(store.projects).forEach((proj, pIdx) => {
                projectColorMap[proj.id] = pIdx;
            });
            // Build goals by dept, each tagged with its project's colorIdx
            const goalsByDept = {};
            Object.values(store.goals).forEach(goal => {
                const milestone = store.milestones[goal.milestone_id];
                if (!milestone)
                    return;
                const colorIdx = projectColorMap[milestone.project_id] ?? 0;
                // Find which dept this goal belongs to (via tasks)
                const goalTasks = goal.tasks.map(tId => store.tasks[tId]).filter(Boolean);
                const deptName = goalTasks.length > 0 ? goalTasks[0].dept : 'Unassigned';
                if (!goalsByDept[deptName])
                    goalsByDept[deptName] = [];
                goalsByDept[deptName].push({
                    id: goal.id,
                    description: goal.description,
                    status: goal.status,
                    colorIdx
                });
            });
            const departments = Object.values(store.departments).map(dept => ({
                id: dept.id,
                name: dept.name,
                agents: dept.agents.map(agentId => store.agents[agentId]).filter(Boolean).map(agent => ({
                    id: agent.id,
                    name: agent.name,
                    status: agent.status,
                    current_task_id: agent.current_task_id
                })),
                goals: goalsByDept[dept.name] || []
            }));
            res.json({
                company: store.company ? {
                    id: store.company.id,
                    name: store.company.name
                } : null,
                ceo: { id: 'ceo', name: 'CEO', active: true },
                departments
            });
        });
        app.get('/api/projects', (_req, res) => {
            // Project chart shows PROJECTS → MILESTONES → GOALS (with dept assignments)
            const projects = Object.values(store.projects).map((proj, pIdx) => ({
                id: proj.id,
                name: proj.name,
                colorIdx: pIdx, // for color coding
                milestones: proj.milestones.map(msId => {
                    const milestone = store.milestones[msId];
                    if (!milestone)
                        return null;
                    return {
                        id: milestone.id,
                        description: milestone.description,
                        deadline: milestone.deadline,
                        status: milestone.status,
                        goals: milestone.goals.map(gId => {
                            const goal = store.goals[gId];
                            if (!goal)
                                return null;
                            // Find which dept this goal is assigned to (via tasks)
                            const goalTasks = goal.tasks.map(tId => store.tasks[tId]).filter(Boolean);
                            const deptName = goalTasks.length > 0 ? goalTasks[0].dept : 'Unassigned';
                            return {
                                id: goal.id,
                                description: goal.description,
                                status: goal.status,
                                dept: deptName,
                                tasks: goalTasks
                            };
                        }).filter(Boolean)
                    };
                }).filter(Boolean)
            }));
            res.json({ projects });
        });
        app.post('/api/run-round', (req, res) => {
            const { round } = req.body;
            res.json({ success: true, round });
            broadcast({ type: 'round_start', data: { round } });
        });
        app.post('/api/emit-event', (req, res) => {
            const jobworldDir = getJobworldDir();
            if (!jobworldDir) {
                return res.status(400).json({ error: 'No jobworld directory configured' });
            }
            const event = req.body;
            // Server generates timestamp - override any client-provided value
            event.timestamp = new Date().toISOString();
            const eventPath = path.join(jobworldDir, 'event-stream', EVENT_FILE);
            fs.appendFileSync(eventPath, JSON.stringify(event) + '\n');
            // Process observation to update goal/milestone status
            processObservation(event);
            broadcast({ type: 'event', data: event });
            res.json({ success: true });
        });
        app.get('/api/config', (_req, res) => {
            const jobworldDir = getJobworldDir();
            res.json({
                jobworldDir,
                serverPort: server?.address()?.port ?? null,
            });
        });
        // Ralph Loop controls
        app.get('/api/ralph-loop', (_req, res) => {
            const jobworldDir = getJobworldDir();
            if (!jobworldDir) {
                return res.status(400).json({ error: 'No jobworld directory configured' });
            }
            const switchPath = path.join(jobworldDir, '.claude', 'afk-loop-switch');
            if (!fs.existsSync(switchPath)) {
                return res.json({ on: false, next: '', constant: '', exists: false });
            }
            try {
                const content = fs.readFileSync(switchPath, 'utf-8');
                const data = JSON.parse(content);
                res.json({ ...data, exists: true });
            }
            catch {
                res.status(500).json({ error: 'Failed to parse switch file' });
            }
        });
        app.put('/api/ralph-loop', (req, res) => {
            const jobworldDir = getJobworldDir();
            if (!jobworldDir) {
                return res.status(400).json({ error: 'No jobworld directory configured' });
            }
            const switchDir = path.join(jobworldDir, '.claude');
            const switchPath = path.join(switchDir, 'afk-loop-switch');
            // Read existing or defaults
            let data = { on: false, next: '', constant: '' };
            if (fs.existsSync(switchPath)) {
                try {
                    data = JSON.parse(fs.readFileSync(switchPath, 'utf-8'));
                }
                catch {
                    // ignore parse errors
                }
            }
            // Apply updates from request body
            const { on, next, constant } = req.body;
            if (typeof on === 'boolean')
                data.on = on;
            if (typeof next === 'string')
                data.next = next;
            if (typeof constant === 'string')
                data.constant = constant;
            // Ensure directory exists
            if (!fs.existsSync(switchDir)) {
                fs.mkdirSync(switchDir, { recursive: true });
            }
            fs.writeFileSync(switchPath, JSON.stringify(data, null, 2) + '\n');
            res.json({ ...data, exists: true });
        });
        // Set up entity CRUD routes
        setupApiRoutes(app);
        // Start server
        const selectedPort = port || 3847;
        server = app.listen(selectedPort, () => {
            console.log(`[AI Jobworld Server] Running on port ${selectedPort}`);
            resolve(selectedPort);
        });
        // WebSocket
        wss = new ws_1.WebSocketServer({ server });
        wss.on('connection', (ws) => {
            clients.add(ws);
            ws.on('close', () => {
                clients.delete(ws);
            });
        });
    });
}
function stopServer() {
    if (wss) {
        wss.close();
        wss = null;
    }
    if (server) {
        server.close();
        server = null;
    }
}
function broadcast(message) {
    const data = JSON.stringify(message);
    clients.forEach((client) => {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            client.send(data);
        }
    });
}
function getJobworldDir() {
    return process.env.JOBWORLD_DIR || null;
}
function getDataPath() {
    const dir = getJobworldDir();
    if (!dir)
        return null;
    return path.join(dir, 'event-stream', DATA_FILE);
}
function loadEvents() {
    const jobworldDir = getJobworldDir();
    if (!jobworldDir)
        return [];
    const eventPath = path.join(jobworldDir, 'event-stream', EVENT_FILE);
    if (!fs.existsSync(eventPath))
        return [];
    const content = fs.readFileSync(eventPath, 'utf-8');
    return content.split('\n').filter(Boolean).map(line => {
        try {
            return JSON.parse(line);
        }
        catch {
            return null;
        }
    }).filter(Boolean);
}
function saveData() {
    const dataPath = getDataPath();
    if (!dataPath)
        return;
    const dir = path.dirname(dataPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dataPath, JSON.stringify(store, null, 2));
}
function loadData() {
    const dataPath = getDataPath();
    if (!dataPath || !fs.existsSync(dataPath))
        return;
    try {
        const content = fs.readFileSync(dataPath, 'utf-8');
        const data = JSON.parse(content);
        store.company = data.company;
        store.departments = data.departments || {};
        store.agents = data.agents || {};
        store.projects = data.projects || {};
        store.milestones = data.milestones || {};
        store.goals = data.goals || {};
        store.tasks = data.tasks || {};
    }
    catch (e) {
        console.error('[AI Jobworld] Failed to load data:', e);
    }
}
// ============================================
// ENTITY CREATION HELPERS
// ============================================
function createCompany(name) {
    const company = {
        id: `company-${Date.now()}`,
        name,
        dept_ids: [],
        project_ids: [],
        created_at: new Date().toISOString(),
    };
    store.company = company;
    saveData();
    return company;
}
function createDepartment(name) {
    const dept = {
        id: `dept-${Date.now()}`,
        name,
        agents: [],
        created_at: new Date().toISOString(),
    };
    store.departments[dept.id] = dept;
    if (store.company) {
        store.company.dept_ids.push(dept.id);
    }
    saveData();
    return dept;
}
function createAgent(deptId, name, agentFilePath) {
    const agent = {
        id: `agent-${Date.now()}`,
        dept_id: deptId,
        name,
        status: 'idle',
        current_task_id: null,
        agent_file_path: agentFilePath,
        created_at: new Date().toISOString(),
    };
    store.agents[agent.id] = agent;
    const dept = store.departments[deptId];
    if (dept) {
        dept.agents.push(agent.id);
    }
    saveData();
    return agent;
}
function createProject(name, description) {
    const project = {
        id: `project-${Date.now()}`,
        name,
        description,
        milestones: [],
        created_at: new Date().toISOString(),
    };
    store.projects[project.id] = project;
    if (store.company) {
        store.company.project_ids.push(project.id);
    }
    saveData();
    return project;
}
function createMilestone(projectId, description, deadline) {
    const milestone = {
        id: `milestone-${Date.now()}`,
        project_id: projectId,
        description,
        deadline,
        status: 'pending',
        goals: [],
        created_at: new Date().toISOString(),
    };
    store.milestones[milestone.id] = milestone;
    const project = store.projects[projectId];
    if (project) {
        project.milestones.push(milestone.id);
    }
    saveData();
    return milestone;
}
function createGoal(milestoneId, description) {
    const goal = {
        id: `goal-${Date.now()}`,
        milestone_id: milestoneId,
        description,
        status: 'pending',
        tasks: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    store.goals[goal.id] = goal;
    const milestone = store.milestones[milestoneId];
    if (milestone) {
        milestone.goals.push(goal.id);
    }
    saveData();
    return goal;
}
function createTask(goalId, dept, description) {
    const task = {
        id: `task-${Date.now()}`,
        goal_id: goalId,
        dept,
        agent_id: null,
        description,
        status: 'open', // Tasks start as open, agents pull from open
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    store.tasks[task.id] = task;
    const goal = store.goals[goalId];
    if (goal) {
        goal.tasks.push(task.id);
    }
    saveData();
    return task;
}
// ============================================
// EVENT PROCESSING
// ============================================
function processObservation(event) {
    const { observation } = event;
    const { goal_id, task, status, desc } = observation;
    const goal = store.goals[goal_id];
    if (!goal) {
        console.log(`[AI Jobworld] Unknown goal: ${goal_id}`);
        return;
    }
    const taskEntity = store.tasks[task];
    if (!taskEntity) {
        console.log(`[AI Jobworld] Unknown task: ${task}`);
        return;
    }
    // Agent marks task as supposedly_done (completed, pending CEO review)
    if (status === 'completed') {
        taskEntity.status = 'supposedly_done';
        taskEntity.result = desc;
        taskEntity.updated_at = new Date().toISOString();
    }
    else if (status === 'blocked') {
        taskEntity.status = 'blocked';
        taskEntity.blocked_reason = desc;
        taskEntity.updated_at = new Date().toISOString();
    }
    // Update goal status based on supposedly_done tasks (pending CEO review)
    // Note: CEO must confirm before goal is truly 'met'
    const goalTasks = goal.tasks.map(t => store.tasks[t]).filter(Boolean);
    const allSupposedlyDone = goalTasks.length > 0 && goalTasks.every(t => t.status === 'supposedly_done' || t.status === 'complete');
    const anyBlocked = goalTasks.some(t => t.status === 'blocked');
    if (allSupposedlyDone && !anyBlocked) {
        goal.status = 'pending'; // Waiting for CEO review
    }
    else if (anyBlocked) {
        goal.status = 'not';
    }
    goal.updated_at = new Date().toISOString();
    // Assign task to agent if supposedly_done
    if (status === 'completed' && taskEntity.agent_id) {
        const agent = store.agents[taskEntity.agent_id];
        if (agent) {
            agent.status = 'idle';
            agent.current_task_id = null;
        }
    }
    saveData();
}
// CEO REVIEW: Mark task as complete or send back to open
function ceoReviewTask(taskId, decision) {
    const task = store.tasks[taskId];
    if (!task) {
        console.log(`[AI Jobworld] Unknown task for CEO review: ${taskId}`);
        return;
    }
    if (decision === 'complete') {
        task.status = 'complete';
        task.updated_at = new Date().toISOString();
    }
    else {
        // Send back to open - agent can pull again
        task.status = 'open';
        task.result = undefined;
        task.updated_at = new Date().toISOString();
    }
    // Recalculate goal status after CEO decision
    const goal = store.goals[task.goal_id];
    if (goal) {
        const goalTasks = goal.tasks.map(t => store.tasks[t]).filter(Boolean);
        const allComplete = goalTasks.length > 0 && goalTasks.every(t => t.status === 'complete');
        const anyBlocked = goalTasks.some(t => t.status === 'blocked');
        if (allComplete && !anyBlocked) {
            goal.status = 'met';
        }
        else if (anyBlocked) {
            goal.status = 'not';
        }
        else {
            goal.status = 'pending';
        }
        goal.updated_at = new Date().toISOString();
        // Recalculate milestone status
        const milestone = store.milestones[goal.milestone_id];
        if (milestone) {
            const milestoneGoals = milestone.goals.map(g => store.goals[g]).filter(Boolean);
            const allGoalsMet = milestoneGoals.length > 0 && milestoneGoals.every(g => g.status === 'met');
            const anyGoalNot = milestoneGoals.some(g => g.status === 'not');
            if (allGoalsMet) {
                milestone.status = 'true';
            }
            else if (anyGoalNot) {
                milestone.status = 'false';
            }
        }
    }
    saveData();
}
// Get open tasks for an agent to pull
function getOpenTasks(agentId) {
    const allTasks = Object.values(store.tasks);
    const openTasks = allTasks.filter(t => t.status === 'open');
    // If agentId provided, filter to that agent's dept or unassigned
    if (agentId) {
        const agent = store.agents[agentId];
        if (agent) {
            return openTasks.filter(t => t.dept === agent.dept_id || !t.agent_id);
        }
    }
    return openTasks;
}
// ============================================
// API ROUTES
// ============================================
function setupApiRoutes(app) {
    // Company
    app.get('/api/company', (_req, res) => {
        res.json(store.company);
    });
    app.post('/api/company', (req, res) => {
        const { name } = req.body;
        const company = createCompany(name || 'AI Jobworld');
        res.json(company);
    });
    // Departments
    app.get('/api/departments', (_req, res) => {
        res.json(Object.values(store.departments));
    });
    app.post('/api/departments', (req, res) => {
        const { name } = req.body;
        const dept = createDepartment(name || 'New Department');
        res.json(dept);
    });
    // Agents
    app.get('/api/agents', (_req, res) => {
        res.json(Object.values(store.agents));
    });
    app.post('/api/agents', (req, res) => {
        const { dept_id, name, agent_file_path } = req.body;
        const agent = createAgent(dept_id, name || 'New Agent', agent_file_path);
        res.json(agent);
    });
    // Projects list (raw)
    app.get('/api/projects/list', (_req, res) => {
        res.json(Object.values(store.projects));
    });
    app.post('/api/projects', (req, res) => {
        const { name, description } = req.body;
        const project = createProject(name || 'New Project', description || '');
        res.json(project);
    });
    // Milestones
    app.get('/api/milestones', (_req, res) => {
        res.json(Object.values(store.milestones));
    });
    app.post('/api/milestones', (req, res) => {
        const { project_id, description, deadline } = req.body;
        const milestone = createMilestone(project_id, description || '', deadline || '');
        res.json(milestone);
    });
    // Goals
    app.get('/api/goals', (_req, res) => {
        res.json(Object.values(store.goals));
    });
    app.post('/api/goals', (req, res) => {
        const { milestone_id, description } = req.body;
        const goal = createGoal(milestone_id, description || '');
        res.json(goal);
    });
    // Tasks
    app.get('/api/tasks', (_req, res) => {
        res.json(Object.values(store.tasks));
    });
    app.post('/api/tasks', (req, res) => {
        const { goal_id, dept, description } = req.body;
        const task = createTask(goal_id, dept || '', description || '');
        res.json(task);
    });
    // Full state
    app.get('/api/state', (_req, res) => {
        res.json(store);
    });
    // Assign task to agent
    app.post('/api/assign-task', (req, res) => {
        const { task_id, agent_id } = req.body;
        const task = store.tasks[task_id];
        const agent = store.agents[agent_id];
        if (!task || !agent) {
            return res.status(404).json({ error: 'Task or agent not found' });
        }
        task.agent_id = agent_id;
        task.status = 'open';
        agent.current_task_id = task_id;
        agent.status = 'working';
        saveData();
        res.json({ task, agent });
    });
    // Day tracking
    app.get('/api/day', (_req, res) => {
        const tasks = Object.values(store.tasks);
        const events = loadEvents();
        const dayStart = new Date(store.day_started_at);
        const dayTasks = tasks.filter(t => new Date(t.created_at) >= dayStart);
        res.json({
            day: store.day,
            started_at: store.day_started_at,
            tasks_created: dayTasks.length,
            tasks_completed: dayTasks.filter(t => t.status === 'complete').length,
            tasks_supposedly_done: dayTasks.filter(t => t.status === 'supposedly_done').length,
            events_today: events.filter(e => new Date(e.timestamp) >= dayStart).length
        });
    });
    app.post('/api/close-day', (_req, res) => {
        store.day += 1;
        store.day_started_at = new Date().toISOString();
        saveData();
        res.json({ day: store.day, started_at: store.day_started_at });
    });
    // CEO Review: Mark task as complete or send back to open
    app.post('/api/ceo-review', (req, res) => {
        const { task_id, decision } = req.body;
        if (!task_id || !decision) {
            return res.status(400).json({ error: 'task_id and decision required' });
        }
        if (decision !== 'complete' && decision !== 'not_complete') {
            return res.status(400).json({ error: 'decision must be "complete" or "not_complete"' });
        }
        const task = store.tasks[task_id];
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        ceoReviewTask(task_id, decision);
        res.json({ success: true, task: store.tasks[task_id] });
    });
    // Get tasks supposedly done (pending CEO review)
    app.get('/api/tasks/supposedly-done', (_req, res) => {
        const tasks = Object.values(store.tasks).filter(t => t.status === 'supposedly_done');
        res.json(tasks);
    });
    // Get open tasks (for agents to pull)
    app.get('/api/tasks/open', (req, res) => {
        const agentId = req.query.agent_id;
        const tasks = getOpenTasks(agentId);
        // Return top 3 highest priority (just return all for now, sorted by created_at)
        const topTasks = tasks.sort((a, b) => a.created_at.localeCompare(b.created_at)).slice(0, 3);
        res.json(topTasks);
    });
}
