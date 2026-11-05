import fs from 'node:fs';
import path from 'node:path';

const env = fs.readFileSync('.env', 'utf8');
const getVal = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim();
const clientId = getVal('YOUTUBE_CLIENT_ID');
const clientSecret = getVal('YOUTUBE_CLIENT_SECRET');
const refreshToken = getVal('YOUTUBE_REFRESH_TOKEN');

const uploads = [
  { videoId: 'lavITk04xgM', title: 'NTA-Style CBT Practice for Your Students', file: 'thumb-1-cbt.png' },
  { videoId: 'SsvByTgk-QA', title: 'Can Students Cheat in an Online Exam?', file: 'thumb-2-proctor.png' },
  { videoId: 'Jd-AYSjA9F8', title: 'अपने DPP को 2 मिनट में असली online test बनाइए', file: 'thumb-3-dpp.png' },
  { videoId: '6uLrstwyL1g', title: 'PDF से Online Test सिर्फ़ 2 मिनट में', file: 'thumb-4-pdf.png' },
  { videoId: 'J41o0W63udA', title: 'Book की Photo से Online Test, सिर्फ़ 17 सेकंड में', file: 'thumb-5-photo.png' },
  { videoId: 'RWaYA4YlRYY', title: 'How to Analyse Online Test Results Like a Pro', file: 'thumb-6-results.png' },
  { videoId: 'lG0tHZCOqjY', title: 'Make Your Online Exam Open and Close on Time', file: 'thumb-7-sched.png' }
];

async function getAccessToken() {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error('Failed to get access token: ' + JSON.stringify(data));
  }
  return data.access_token;
}

async function uploadThumbnail(token, videoId, filePath) {
  const fileBytes = fs.readFileSync(filePath);
  const url = `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'image/png'
    },
    body: fileBytes
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function main() {
  const token = await getAccessToken();
  console.log('Access token acquired.');

  const results = [];
  for (const item of uploads) {
    const thumbPath = path.join('videos/channel/thumbnails/dist', item.file);
    console.log(`Uploading ${item.file} for video ${item.videoId} ("${item.title}")...`);
    try {
      const res = await uploadThumbnail(token, item.videoId, thumbPath);
      if (res.status === 200) {
        console.log(`✓ Success: ${item.videoId} thumbnail updated!`);
        results.push({ ...item, success: true, details: res.data });
      } else {
        console.error(`✗ Failed for ${item.videoId}: HTTP ${res.status}`, JSON.stringify(res.data));
        results.push({ ...item, success: false, error: res.data });
      }
    } catch (err) {
      console.error(`✗ Exception for ${item.videoId}:`, err);
      results.push({ ...item, success: false, error: err.message });
    }
  }

  console.log('\n--- UPLOAD SUMMARY ---');
  for (const r of results) {
    console.log(`${r.videoId} (${r.title}): ${r.success ? 'UPDATED' : 'FAILED'}`);
  }
}

main().catch(console.error);

