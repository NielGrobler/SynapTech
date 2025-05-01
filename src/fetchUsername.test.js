import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as userInfoModule from './userInfo.js';
import fetchUsername from './fetchUsername.js';

describe('fetchUsername.js', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="username"></div>';
  });

  it('sets the username correctly from userInfo.fetchFromApi()', async () => {
    vi.spyOn(userInfoModule, 'default', 'get').mockReturnValue({
      fetchFromApi: vi.fn().mockResolvedValue({ name: 'Jane Doe' })
    });

    await fetchUsername.setUsername();

    expect(document.getElementById("username").innerHTML).toBe("Jane");
  });

  it('handles names with multiple spaces correctly', async () => {
    vi.spyOn(userInfoModule, 'default', 'get').mockReturnValue({
      fetchFromApi: vi.fn().mockResolvedValue({ name: '  Alice   Wonderland  ' })
    });

    await fetchUsername.setUsername();

    expect(document.getElementById("username").innerHTML).toBe("Alice");
  });
});
