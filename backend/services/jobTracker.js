// Simple in-memory job tracker
const jobs = new Map();

const getJob = (jobId) => {
  return jobs.get(jobId);
};

const createJob = (jobId, initialData = {}) => {
  const job = {
    jobId,
    status: 'queued', // queued, downloading, merging, done, error
    percent: 0,
    stage: 'queued',
    error: null,
    filePath: null,
    ...initialData
  };
  jobs.set(jobId, job);
  return job;
};

const updateJob = (jobId, updates) => {
  const job = jobs.get(jobId);
  if (job) {
    Object.assign(job, updates);
    jobs.set(jobId, job);
  }
  return job;
};

module.exports = {
  getJob,
  createJob,
  updateJob
};
