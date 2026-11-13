'use strict';

// The few GitHub REST calls the action needs, over the built-in fetch.

function client({ token, repo, apiUrl = 'https://api.github.com' }) {
  async function request(method, route, body) {
    const response = await fetch(`${apiUrl}/repos/${repo}${route}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'deployscope',
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (response.status === 404 && method === 'GET') return null;
    if (!response.ok) {
      throw new Error(`${method} ${route} answered ${response.status}: ${(await response.text()).slice(0, 200)}`);
    }
    return response.json();
  }

  // One comment per pull request: the comment carrying `marker` is rewritten
  // on every run instead of a new one being added.
  async function upsertComment(pullRequest, marker, body) {
    for (let page = 1; page <= 10; page++) {
      const comments = await request('GET', `/issues/${pullRequest}/comments?per_page=100&page=${page}`) || [];
      const existing = comments.find((comment) => comment.body && comment.body.includes(marker));
      if (existing) return request('PATCH', `/issues/comments/${existing.id}`, { body });
      if (comments.length < 100) break;
    }
    return request('POST', `/issues/${pullRequest}/comments`, { body });
  }

  // Commits one file to `branch` through the git data API, creating the branch
  // as an orphan when it does not exist. Returns the new commit's SHA.
  async function publishFile(branch, filePath, content, message) {
    const ref = await request('GET', `/git/ref/heads/${branch}`);
    const parent = ref ? ref.object.sha : null;
    const baseTree = parent ? (await request('GET', `/git/commits/${parent}`)).tree.sha : undefined;
    const blob = await request('POST', '/git/blobs', { content, encoding: 'utf-8' });
    const tree = await request('POST', '/git/trees', {
      ...(baseTree ? { base_tree: baseTree } : {}),
      tree: [{ path: filePath, mode: '100644', type: 'blob', sha: blob.sha }],
    });
    const commit = await request('POST', '/git/commits', { message, tree: tree.sha, parents: parent ? [parent] : [] });
    if (parent) await request('PATCH', `/git/refs/heads/${branch}`, { sha: commit.sha });
    else await request('POST', '/git/refs', { ref: `refs/heads/${branch}`, sha: commit.sha });
    return commit.sha;
  }

  return { upsertComment, publishFile };
}

module.exports = { client };
