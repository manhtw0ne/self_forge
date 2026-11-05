import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { english, initialLanguage, normalizeLanguage, translate, localizedCategory } from './language.js';

test('saved preference wins and language variants are normalized', () => {
  assert.equal(initialLanguage({ getItem: () => 'vi' }, 'en-US'), 'vi');
  assert.equal(initialLanguage({ getItem: () => null }, 'en-GB'), 'en');
  assert.equal(normalizeLanguage('VI-vn'), 'vi');
  assert.equal(normalizeLanguage('fr'), null);
});
test('blocked storage and unsupported languages have a safe fallback', () => {
  assert.equal(initialLanguage({ getItem: () => 'invalid' }, 'en-US'), 'en');
  assert.equal(initialLanguage({ getItem: () => { throw new Error('blocked'); } }, 'vi'), 'vi');
  assert.equal(initialLanguage(null, 'fr'), 'vi');
});
test('countdowns and user data stay intact while translating', () => {
  assert.equal(translate('en', 'Gửi lại sau {seconds}s', { seconds: 30 }), 'Resend in 30s');
  assert.equal(translate('vi', 'Gửi lại sau {seconds}s', { seconds: 30 }), 'Gửi lại sau 30s');
  assert.equal(translate('en', 'Đã yêu cầu mã cho {email}.', { email: 'user@example.com' }),
    'A code was requested for user@example.com.');
  assert.equal(translate('en', '__proto__'), '__proto__');
  assert.equal(translate('en', 'toString'), 'toString');
});
test('translations preserve all substitution fields and common auth messages', () => {
  const fields = text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
  for (const [source, target] of Object.entries(english)) {
    assert.ok(target.trim());
    assert.deepEqual(fields(target), fields(source), source);
  }
  assert.equal(translate('en', 'Mật khẩu xác nhận không khớp.'), 'The passwords do not match.');
  assert.equal(translate('en', 'Thói quen'), 'Habits');
});
test('habit and goal messages translate counts without changing user text', () => {
  assert.equal(translate('en', '{points} điểm', { points: 20 }), '20 points');
  assert.equal(translate('en', '{percent}% hoàn thành', { percent: 75 }), '75% complete');
  assert.equal(translate('en', '📦 Đã tạo {count} thói quen từ "{name}"!', { count: 2, name: 'My routine' }),
    '📦 Created 2 habits from "My routine"!');
  assert.equal(translate('en', 'Mục tiêu đã kết thúc, không thể thêm tiến độ.'),
    'This goal has ended. You cannot add more progress.');
});

test('only system category names are translated, even when custom names match them', () => {
  assert.equal(localizedCategory('en', { name: 'Sức khỏe', systemDefault: true }), 'Health');
  assert.equal(localizedCategory('en', { name: 'Sức khỏe', systemDefault: false }), 'Sức khỏe');
  assert.equal(localizedCategory('vi', { name: 'Sức khỏe', systemDefault: true }), 'Sức khỏe');
  assert.equal(localizedCategory('en', undefined), undefined);
});

test('statistics distinguish percentage point changes and preserve review text parameters', () => {
  assert.equal(translate('en', '{count} điểm phần trăm so với tháng trước', { count: 20 }), '20 percentage points compared with last month');
  assert.equal(translate('en', '{date}: {count} lượt hoàn thành, {score} điểm', { date: '1/1/2026', count: 3, score: -5 }), '1/1/2026: 3 completions, -5 points');
  assert.equal(translate('en', '"{feature}" là tính năng dành cho người dùng Premium.', { feature: 'Weekly review' }), '"Weekly review" is available with Premium.');
});

test('settings and rewards translate parameterized messages and schedule days', () => {
  assert.equal(translate('en', 'Cần {count} XP nữa', { count: 35 }), 'Need 35 more XP');
  assert.equal(translate('en', 'Huy hiệu ({earned}/{total})', { earned: 2, total: 12 }), 'Badges (2/12)');
  assert.equal(translate('en', 'T2'), 'Mon');
  assert.equal(translate('vi', 'T2'), 'T2');
  assert.equal(translate('en', 'Không thể tải phần thưởng tùy chỉnh.'), 'Unable to load custom rewards.');
});

test('premium copy distinguishes proposed pricing from available payment', () => {
  assert.equal(translate('en', 'Premium chưa mở bán'), 'Premium is not yet for sale');
  assert.equal(translate('en', 'Tối đa 10 thói quen đang bật'), 'Up to 10 active habits');
  assert.equal(translate('en', 'Thời hạn dự kiến: 1 năm'), 'Proposed term: 1 year');
});

test('new dashboard and paused-habit messages remain usable in English', () => {
  assert.equal(translate('en', 'Người mới bắt đầu với một bố cục gọn; chọn các phần bổ sung bạn muốn xem.'),
    'New users start with a simpler layout; choose any additional sections you want to see.');
  assert.equal(translate('en', 'Đang mở phần này...'), 'Opening this section…');
  assert.equal(translate('en', 'Thói quen đã tắt. Hãy bật lại trước khi dùng bảo vệ streak.'),
    'This habit is inactive. Reactivate it before using streak protection.');
});

test('an untranslated Vietnamese server detail has a clear English fallback', () => {
  const source = 'Lỗi máy chủ mới chưa có bản dịch.';
  assert.equal(translate('en', source), 'We could not complete this action. Review your input and try again.');
  assert.equal(translate('vi', source), source);
  assert.equal(translate('en', 'Unrecognized English detail'), 'Unrecognized English detail');
});

test('Vietnamese UI literals passed directly to translation have an English entry', () => {
  const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const files = [];
  const walk = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.(js|jsx)$/.test(entry.name) && !entry.name.endsWith('.test.js')) files.push(path);
    }
  };
  walk(sourceRoot);
  const untranslated = [];
  const directTranslation = /\bt\(\s*(['"])([^'"\n]+)\1/g;
  for (const file of files) {
    for (const match of readFileSync(file, 'utf8').matchAll(directTranslation)) {
      const source = match[2];
      if (/[À-ỹ]/.test(source) && !Object.hasOwn(english, source)) untranslated.push({ file, source });
    }
  }
  assert.deepEqual(untranslated, []);
});
