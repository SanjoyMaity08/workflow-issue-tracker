import chai from 'chai';
import chaiHttp from 'chai-http';
import app from '../app.js';
import User from '../models/User.js';
import Team from '../models/Team.js';
import Issue from '../models/Issue.js';
import Activity from '../models/Activity.js';
import bcrypt from 'bcrypt';

chai.use(chaiHttp);
const { expect } = chai;

describe('Issue and Sub-Issue Creation Testing', () => {
  let authToken;
  let testUser;
  let testTeam;

  before(async function () {
    this.timeout(60000);

    const salt = await bcrypt.genSalt(4);
    const hashedPassword = await bcrypt.hash('Test@123', salt);

    testUser = await User.create({
      name: 'Test User',
      email: 'testuser@workflow.dev',
      password: hashedPassword,
    });

    testTeam = await Team.create({
      name: 'Test Team',
      key: 'TST',
      icon: 'T',
      description: 'Team for testing',
      members: [testUser._id],
    });

    const loginResponse = await chai
      .request(app)
      .post('/api/auth/login')
      .send({
        email: 'testuser@workflow.dev',
        password: 'Test@123',
      });
    authToken = loginResponse.body.token;
  });

  it('should successfully create a new issue with all required fields', async () => {
    // Send request to create a new issue with title and team
    const response = await chai
      .request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'New Feature Implementation',
        teamId: testTeam._id.toString(),
        description: 'Implement new feature for users',
        status: 'todo',
        priority: 'high',
      });

    // Issue is created successfully with proper identifier and default values
    expect(response).to.have.status(201);
    expect(response.body).to.have.property('issue');
    expect(response.body.issue).to.have.property('title', 'New Feature Implementation');
    expect(response.body.issue).to.have.property('identifier', 'TST-1');
    expect(response.body.issue).to.have.property('status', 'todo');
    expect(response.body.issue).to.have.property('priority', 'high');
    expect(response.body.issue.team).to.have.property('key', 'TST');
  }).timeout(20000);

  it('should successfully create a sub-issue linked to a parent issue', async () => {
    // First, create a parent issue
    const parentResponse = await chai
      .request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Parent Task - API Development',
        teamId: testTeam._id.toString(),
        status: 'in_progress',
        priority: 'medium',
      });

    const parentIssueId = parentResponse.body.issue._id;

    // Create a sub-issue with parentIssue reference
    const subIssueResponse = await chai
      .request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Sub-task - Write API Tests',
        teamId: testTeam._id.toString(),
        parentIssue: parentIssueId,
        status: 'todo',
        priority: 'low',
      });

    // Sub-issue is created with proper parent reference
    expect(subIssueResponse).to.have.status(201);
    expect(subIssueResponse.body.issue).to.have.property('title', 'Sub-task - Write API Tests');
    expect(subIssueResponse.body.issue).to.have.property('parentIssue', parentIssueId);
    expect(subIssueResponse.body.issue).to.have.property('identifier').that.matches(/^TST-\d+$/);
  }).timeout(20000);

  it('should auto-increment issue identifiers for the same team', async () => {
    // Create first issue
    const firstResponse = await chai
      .request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'First Issue',
        teamId: testTeam._id.toString(),
      });

    // Create second issue
    const secondResponse = await chai
      .request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Second Issue',
        teamId: testTeam._id.toString(),
      });

    // Create third issue
    const thirdResponse = await chai
      .request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Third Issue',
        teamId: testTeam._id.toString(),
      });

    // Identifiers increment sequentially (TST-1, TST-2, TST-3, etc.)
    expect(firstResponse.body.issue.identifier).to.match(/^TST-\d+$/);
    expect(secondResponse.body.issue.identifier).to.match(/^TST-\d+$/);
    expect(thirdResponse.body.issue.identifier).to.match(/^TST-\d+$/);

    const firstNum = parseInt(firstResponse.body.issue.identifier.split('-')[1]);
    const secondNum = parseInt(secondResponse.body.issue.identifier.split('-')[1]);
    const thirdNum = parseInt(thirdResponse.body.issue.identifier.split('-')[1]);

    expect(secondNum).to.equal(firstNum + 1);
    expect(thirdNum).to.equal(secondNum + 1);
  }).timeout(20000);

  it('should fail to create an issue when required title is missing', async () => {
    // Send request without title field
    const response = await chai
      .request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        teamId: testTeam._id.toString(),
        description: 'Issue without title',
      });

    // Request fails with validation error
    expect(response).to.have.status(400);
    expect(response.body).to.have.property('message');
    expect(response.body.message).to.include('required');
  }).timeout(20000);

  it('should fail to create an issue when team does not exist', async () => {
    // Send request with invalid/non-existent team ID
    const fakeTeamId = '507f1f77bcf86cd799439011';
    const response = await chai
      .request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Issue with fake team',
        teamId: fakeTeamId,
      });

    // Request fails with team not found error
    expect(response).to.have.status(404);
    expect(response.body).to.have.property('message', 'Team not found');
  }).timeout(20000);

  it('should fail to create an issue when user is not authenticated', async () => {
    // Send request without authentication token
    const response = await chai
      .request(app)
      .post('/api/issues')
      .send({
        title: 'Unauthorized Issue',
        teamId: testTeam._id.toString(),
      });

    // Request fails with authentication error
    expect(response).to.have.status(401);
    expect(response.body).to.have.property('message');
  }).timeout(20000);

  it('should record a "created" activity entry for every new issue', async () => {
    const response = await chai
      .request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Issue that logs activity',
        teamId: testTeam._id.toString(),
      });

    expect(response).to.have.status(201);

    const activity = await Activity.findOne({
      issue: response.body.issue._id,
      action: 'created',
    });

    expect(activity).to.not.equal(null);
  }).timeout(20000);

  it('should persist the created issue so it appears on the team board', async () => {
    const createResponse = await chai
      .request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Issue visible on the board',
        teamId: testTeam._id.toString(),
        status: 'todo',
      });

    expect(createResponse).to.have.status(201);

    // It is readable straight from the database ...
    const stored = await Issue.findById(createResponse.body.issue._id);
    expect(stored).to.not.equal(null);
    expect(stored.title).to.equal('Issue visible on the board');

    // ... and it comes back from the endpoint the board calls.
    const boardResponse = await chai
      .request(app)
      .get(`/api/issues/team/${testTeam._id.toString()}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(boardResponse).to.have.status(200);
    const titles = boardResponse.body.issues.map((i) => i.title);
    expect(titles).to.include('Issue visible on the board');
  }).timeout(20000);

  it('should list a new sub-issue under its parent on the detail endpoint', async () => {
    const parentResponse = await chai
      .request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Parent with a listed child',
        teamId: testTeam._id.toString(),
      });

    const parent = parentResponse.body.issue;

    await chai
      .request(app)
      .post('/api/issues')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Child that must show up',
        teamId: testTeam._id.toString(),
        parentIssue: parent._id,
      });

    const detailResponse = await chai
      .request(app)
      .get(`/api/issues/${parent.identifier}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(detailResponse).to.have.status(200);
    expect(detailResponse.body).to.have.property('subIssues');
    const childTitles = detailResponse.body.subIssues.map((i) => i.title);
    expect(childTitles).to.include('Child that must show up');
  }).timeout(20000);
});
