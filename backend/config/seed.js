import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

import User from '../models/User.js';
import Team from '../models/Team.js';
import Issue from '../models/Issue.js';
import Activity from '../models/Activity.js';
import Comment from '../models/Comment.js';
import connectDB from './db.js';

dotenv.config();

const USERS = [
  { name: 'Sanjoy Maity', email: 'sanjoy@workflow.dev', password: 'Password@123' },
  { name: 'Jordan Chen', email: 'jordan@workflow.dev', password: 'Password@123' },
  { name: 'Casey Martinez', email: 'casey@workflow.dev', password: 'Password@123' },
  { name: 'Sam Taylor', email: 'sam@workflow.dev', password: 'Password@123' },
  { name: 'Riley kim', email: 'riley@workflow.dev', password: 'Password@123' },
  
];

const TEAMS = [
  {
    name: 'Engineering',
    key: 'ENG',
    icon: 'E',
    color: '#5e6ad2',
    description: 'Platform and product engineering',
  },
  {
    name: 'Design',
    key: 'DES',
    icon: 'D',
    color: '#e5484d',
    description: 'Product design and brand',
  },
  {
    name: 'Marketing',
    key: 'MKT',
    icon: 'M',
    color: '#30a46c',
    description: 'Growth and marketing',
  },
];

// Engineering issues, ordered so that ENG-1 is the oldest. The board in the
// brief shows ENG-3 through ENG-16 spread across Todo / In Progress / In Review.
const ENG_ISSUES = [
  { title: 'Set up project repository', status: 'done', priority: 'high', labels: ['infra'] },
  { title: 'Configure ESLint and Prettier', status: 'done', priority: 'low', labels: ['infra'] },
  { title: 'Add search functionality for issues', status: 'in_review', priority: 'medium', labels: ['frontend'] },
  { title: 'Build real-time notifications system', status: 'in_progress', priority: 'medium', labels: ['backend'] },
  { title: 'Migrate to PostgreSQL read replica', status: 'done', priority: 'medium', labels: ['backend'] },
  { title: 'Optimize database queries for performance', status: 'todo', priority: 'low', labels: ['backend'] },
  { title: 'Setup CI/CD pipeline', status: 'todo', priority: 'high', labels: ['infra'] },
  { title: 'Implement API rate limiting', status: 'todo', priority: 'medium', labels: ['backend', 'security'] },
  { title: 'Add Redis caching layer', status: 'todo', priority: 'medium', labels: ['backend'] },
  { title: 'Write integration tests for auth', status: 'done', priority: 'medium', labels: ['testing'] },
  { title: 'Implement GraphQL API', status: 'in_progress', priority: 'medium', labels: ['backend'] },
  { title: 'Add OAuth 2.0 integration', status: 'in_progress', priority: 'high', labels: ['security'] },
  { title: 'Implement data export feature', status: 'in_progress', priority: 'low', labels: ['frontend'] },
  { title: 'Add two-factor authentication', status: 'in_review', priority: 'high', labels: ['security'] },
  { title: 'Implement webhook system', status: 'in_review', priority: 'medium', labels: ['backend'] },
  { title: 'Create API documentation', status: 'in_review', priority: 'medium', labels: ['docs'] },
  { title: 'Refactor issue board drag and drop', status: 'backlog', priority: 'low', labels: ['frontend'] },
  { title: 'Audit third-party dependencies', status: 'backlog', priority: 'medium', labels: ['security'] },
  { title: 'Create admin dashboard', status: 'todo', priority: 'low', labels: ['frontend'] },
  { title: 'Upgrade Node runtime to 22 LTS', status: 'todo', priority: 'medium', labels: ['infra'] },
];

const DES_ISSUES = [
  { title: 'Design new onboarding flow', status: 'in_progress', priority: 'high', labels: ['ux'] },
  { title: 'Refresh the marketing site hero', status: 'todo', priority: 'medium', labels: ['brand'] },
  { title: 'Build the icon library', status: 'in_review', priority: 'low', labels: ['system'] },
  { title: 'Audit color contrast for accessibility', status: 'todo', priority: 'high', labels: ['a11y'] },
  { title: 'Create empty state illustrations', status: 'done', priority: 'low', labels: ['brand'] },
];

const MKT_ISSUES = [
  { title: 'Plan the Q3 launch campaign', status: 'in_progress', priority: 'high', labels: ['campaign'] },
  { title: 'Write the changelog for v2.4', status: 'todo', priority: 'medium', labels: ['content'] },
  { title: 'Set up lifecycle email sequence', status: 'todo', priority: 'medium', labels: ['email'] },
  { title: 'Publish customer case study', status: 'in_review', priority: 'low', labels: ['content'] },
];

const pick = (arr, i) => arr[i % arr.length];

/**
 * Wipe the collections and insert a predictable demo dataset.
 *
 * `issueCounter` on each team is set to the number of issues created so the
 * next identifier continues the sequence (ENG-21, DES-6, ...).
 */
const seedDatabase = async ({ reset = true, quiet = false } = {}) => {
  const log = (...args) => {
    if (!quiet) console.log(...args);
  };

  if (reset) {
    await Promise.all([
      User.deleteMany({}),
      Team.deleteMany({}),
      Issue.deleteMany({}),
      Activity.deleteMany({}),
      Comment.deleteMany({}),
    ]);
    log('Cleared existing collections');
  }

  const salt = await bcrypt.genSalt(10);
  const users = [];
  for (const u of USERS) {
    const user = await User.create({
      name: u.name,
      email: u.email,
      password: await bcrypt.hash(u.password, salt),
      avatar: u.name.charAt(0).toUpperCase(),
    });
    users.push(user);
  }
  log(`Created ${users.length} users`);

  const memberIds = users.map((u) => u._id);
  const teams = [];
  for (const t of TEAMS) {
    const team = await Team.create({ ...t, members: memberIds, issueCounter: 0 });
    teams.push(team);
  }
  log(`Created ${teams.length} teams`);

  const [eng, des, mkt] = teams;
  const groups = [
    [eng, ENG_ISSUES],
    [des, DES_ISSUES],
    [mkt, MKT_ISSUES],
  ];

  let total = 0;
  for (const [team, list] of groups) {
    let counter = 0;
    for (let i = 0; i < list.length; i += 1) {
      counter += 1;
      const spec = list[i];
      const issue = await Issue.create({
        identifier: `${team.key}-${counter}`,
        title: spec.title,
        description: `${spec.title}. Seeded demo issue for the ${team.name} team.`,
        status: spec.status,
        priority: spec.priority,
        team: team._id,
        assignee: pick(users, i)._id,
        creator: users[0]._id,
        parentIssue: null,
        labels: spec.labels || [],
      });

      await Activity.create({
        issue: issue._id,
        user: users[0]._id,
        action: 'created',
        changes: null,
      });

      total += 1;
    }

    team.issueCounter = counter;
    await team.save();
  }

  log(`Created ${total} issues`);
  log('Seed complete. Log in with alex@workflow.dev / Password@123');

  return { users, teams };
};

export default seedDatabase;

// Allow running this file on its own: `npm run seed`
const isDirectRun =
  process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('config/seed.js');

if (isDirectRun) {
  (async () => {
    try {
      await connectDB();
      await seedDatabase({ reset: true });
      await mongoose.connection.close();
      process.exit(0);
    } catch (error) {
      console.error('Seed failed:', error);
      process.exit(1);
    }
  })();
}
