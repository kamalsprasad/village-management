import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFileUpload } from 'src/composables/useFileUpload';
import { mockStorage } from 'test/helpers/appwrite-mock';

function makeFile(size = 100, name = 'test.txt') {
  const f = { name, size, type: 'text/plain' };
  return f;
}

describe('useFileUpload', () => {
  beforeEach(() => {
    mockStorage.createFile.mockReset();
  });

  it('blocks upload that would exceed quota and notifies an error', async () => {
    const { createUpload } = useFileUpload();
    const { promise } = createUpload('bucket-1', makeFile(1000), {
      userId: 'u1',
      currentUsageBytes: 0,
      quotaBytes: 500,
    });
    const result = await promise;
    expect(result).toBeNull();
    expect(mockStorage.createFile).not.toHaveBeenCalled();
  });

  it('allows upload when quota is unlimited (-1)', async () => {
    mockStorage.createFile.mockResolvedValue({ $id: 'file-1' });
    const { createUpload } = useFileUpload();
    const { promise } = createUpload('bucket-1', makeFile(999999), {
      userId: 'u1',
      currentUsageBytes: 0,
      quotaBytes: -1,
    });
    const result = await promise;
    expect(result).toEqual({ $id: 'file-1' });
    expect(mockStorage.createFile).toHaveBeenCalled();
  });

  it('allows upload within quota and resolves with the file', async () => {
    mockStorage.createFile.mockResolvedValue({ $id: 'file-2' });
    const { createUpload } = useFileUpload();
    const { promise, uploading } = createUpload('bucket-1', makeFile(100), {
      userId: 'u1',
      currentUsageBytes: 400,
      quotaBytes: 1000,
    });
    expect(uploading.value).toBe(true);
    const result = await promise;
    expect(result).toEqual({ $id: 'file-2' });
    expect(uploading.value).toBe(false);
  });

  it('returns null and notifies on upload error', async () => {
    mockStorage.createFile.mockRejectedValue(new Error('network failure'));
    const { createUpload } = useFileUpload();
    const { promise, uploading } = createUpload('bucket-1', makeFile(10), {
      userId: 'u1',
      currentUsageBytes: 0,
      quotaBytes: 1000,
    });
    const result = await promise;
    expect(result).toBeNull();
    expect(uploading.value).toBe(false);
  });

  it('passes explicit permissions when provided', async () => {
    mockStorage.createFile.mockResolvedValue({ $id: 'file-3' });
    const { createUpload } = useFileUpload();
    const customPerms = [{ permission: 'read', role: { role: 'any' } }];
    await createUpload('bucket-1', makeFile(10), {
      userId: 'u1',
      currentUsageBytes: 0,
      quotaBytes: 1000,
      permissions: customPerms,
    }).promise;
    expect(mockStorage.createFile).toHaveBeenCalledWith(
      expect.objectContaining({ permissions: customPerms }),
    );
  });

  it('builds owner read/write/delete permissions from userId when no explicit permissions', async () => {
    mockStorage.createFile.mockResolvedValue({ $id: 'file-4' });
    const { createUpload } = useFileUpload();
    await createUpload('bucket-1', makeFile(10), {
      userId: 'u1',
      currentUsageBytes: 0,
      quotaBytes: 1000,
    }).promise;
    const args = mockStorage.createFile.mock.calls[0][0];
    expect(Array.isArray(args.permissions)).toBe(true);
    expect(args.permissions).toHaveLength(3);
  });

  it('reports progress via onProgress callback', async () => {
    mockStorage.createFile.mockImplementation((opts) => {
      // Simulate two progress events then resolve
      opts.onProgress({ chunksUploaded: 1, chunksTotal: 4 });
      opts.onProgress({ chunksUploaded: 4, chunksTotal: 4 });
      return Promise.resolve({ $id: 'file-5' });
    });
    const { createUpload } = useFileUpload();
    const onProgress = vi.fn();
    const { promise, progress } = createUpload('bucket-1', makeFile(10), {
      userId: 'u1',
      currentUsageBytes: 0,
      quotaBytes: 1000,
      onProgress,
    });
    await promise;
    expect(progress.value).toBe(1);
    expect(onProgress).toHaveBeenCalledWith(0.25);
    expect(onProgress).toHaveBeenCalledWith(1);
  });
});
