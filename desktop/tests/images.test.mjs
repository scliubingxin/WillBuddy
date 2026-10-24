import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Store } from "../core.mjs";
import { createImageService, imageViews } from "../services/images.mjs";
import {
  createImageImporter,
  normalizeNativeImage,
} from "../main/image-files.mjs";
import { imageInfo } from "../src/shared/image-bytes.js";
import { createConversationService } from "../services/conversation.mjs";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=",
  "base64",
);
async function fixture() {
  const dir = await mkdtemp(path.join(tmpdir(), "wb-images-")),
    store = new Store(dir);
  await store.load();
  const images = createImageService({
    store,
    decode: async (bytes) => Buffer.from(bytes),
  });
  return {
    dir,
    store,
    images,
    close: () => rm(dir, { recursive: true, force: true }),
  };
}
test("image metadata stays byte-free; normalized PNG persists and reload verifies original bytes", async () => {
  const f = await fixture();
  try {
    const row = await f.images.importFile("图.png", png);
    assert.equal(row.width, 1);
    assert.equal(row.base64, undefined);
    assert.equal(imageViews(f.store.data)[0].sha256, undefined);
    const s = new Store(f.dir);
    await s.load();
    assert.equal(
      createImageService({ store: s }).preview(row.id).base64,
      png.toString("base64"),
    );
  } finally {
    await f.close();
  }
});
test("invalid format, huge bytes and forged pixel sizes fail before decoder", async () => {
  const f = await fixture();
  try {
    for (const b of [
      Buffer.from("<svg></svg>"),
      Buffer.alloc(2097153),
      (() => {
        const b = Buffer.from(png);
        b.writeUInt32BE(99999, 16);
        return b;
      })(),
    ])
      assert.throws(() => imageInfo(b));
    assert.equal(f.store.data.imageAttachments, undefined);
    await assert.rejects(f.images.importFile("empty", Buffer.from("fake")));
  } finally {
    await f.close();
  }
});
test("import/remove disk failures roll back, concurrent imports serialize; used history images cannot disappear", async () => {
  const f = await fixture();
  try {
    let fail = true,
      save = f.store.save.bind(f.store);
    f.store.save = () => (fail ? Promise.reject(Error("disk")) : save());
    await assert.rejects(f.images.importFile("a", png));
    assert.equal(f.store.data.imageAttachments, undefined);
    fail = false;
    const [a, b] = await Promise.all([
      f.images.importFile("a", png),
      f.images.importFile("b", png),
    ]);
    assert.equal(imageViews(f.store.data).length, 2);
    f.store.data.chats.push({ messages: [{ images: [{ id: a.id }] }] });
    await assert.rejects(f.images.remove(a.id), /历史消息/);
    fail = true;
    await assert.rejects(f.images.remove(b.id), /disk/);
    assert.equal(imageViews(f.store.data).length, 2);
  } finally {
    await f.close();
  }
});
test("missing/tampered/duplicate/too many selections rejected without sending pixels", async () => {
  const f = await fixture();
  try {
    const a = await f.images.importFile("a", png);
    assert.throws(() => f.images.selected(["unknown"]));
    assert.throws(() => f.images.selected([a.id, a.id]));
    assert.throws(() => f.images.selected([a.id, "b", "c", "d"]));
    f.store.data.imageAttachments[0].sha256 = "bad";
    assert.throws(() => f.images.preview(a.id), /完整性/);
  } finally {
    await f.close();
  }
});
test("native picker cancel, no-parent and symlink reject; normalization bounds and no renderer paths", async () => {
  const f = await fixture();
  try {
    const win = { isDestroyed: () => false };
    let called = 0;
    const noParent = createImageImporter({
      dialog: {},
      getWindow: () => null,
      images: f.images,
    });
    await assert.rejects(noParent());
    const cancel = createImageImporter({
      dialog: { showOpenDialog: async () => ({ canceled: true }) },
      getWindow: () => win,
      images: f.images,
    });
    assert.equal(await cancel("/etc/passwd"), null);
    await writeFile(path.join(f.dir, "a.png"), png);
    await symlink("a.png", path.join(f.dir, "link.png"));
    const importer = createImageImporter({
      dialog: {
        showOpenDialog: async () => ({
          filePaths: [path.join(f.dir, "link.png")],
        }),
      },
      getWindow: () => win,
      images: {
        importFile() {
          called++;
        },
      },
    });
    await assert.rejects(importer());
    assert.equal(called, 0);
    assert.throws(() =>
      normalizeNativeImage(
        { createFromBuffer: () => ({ isEmpty: () => true }) },
        png,
      ),
    );
    assert.deepEqual(
      normalizeNativeImage(
        {
          createFromBuffer: () => ({
            isEmpty: () => false,
            getSize: () => ({ width: 1, height: 1 }),
            toPNG: () => png,
          }),
        },
        png,
      ),
      png,
    );
  } finally {
    await f.close();
  }
});
test("vision payload only on explicit current-run consent; historical pictures not silently resent", async () => {
  const f = await fixture();
  try {
    const a = await f.images.importFile("a", png),
      requests = [],
      active = new Map(),
      view = () =>
        structuredClone({
          ...f.store.data,
          imageAttachments: imageViews(f.store.data),
        }),
      service = createConversationService({
        store: f.store,
        images: f.images,
        active,
        key: () => "",
        view,
        executeTool: () => {},
        request: async (s, k, m) => {
          requests.push(m);
          return { text: "夹具回答" };
        },
      });
    await service.run({
      id: "c",
      requestId: "local",
      prompt: "只本机查看",
      images: [a.id],
      sendImages: false,
    });
    assert.equal(typeof requests[0].at(-1).content, "string");
    assert.ok(!JSON.stringify(requests[0]).includes("data:image/"));
    await service.run({
      id: "c",
      requestId: "vision",
      prompt: "看图片",
      images: [a.id],
      sendImages: true,
    });
    assert.equal(
      requests[1].at(-1).content[1].image_url.url,
      "data:image/png;base64," + png.toString("base64"),
    );
    assert.equal(
      f.store.data.chats[0].messages.filter((m) => m.role === "user")[0]
        .imagesSent,
      false,
    );
    await service.run({ id: "c", requestId: "next", prompt: "继续讨论" });
    assert.ok(!JSON.stringify(requests[2]).includes("data:image/"));
  } finally {
    await f.close();
  }
});
test("model target change before a vision request fails closed, no fallback provider", async () => {
  const f = await fixture();
  try {
    const a = await f.images.importFile("a", png);
    let calls = 0;
    const active = new Map(),
      queue = {
        lookup: () => null,
        hasOwner: () => false,
        submit: async (spec, worker, onState) => {
          await onState({ status: "running" });
          f.store.data.settings.model = "different";
          await worker(new AbortController());
        },
      };
    const service = createConversationService({
      store: f.store,
      images: f.images,
      active,
      queue,
      key: () => "",
      view: () => f.store.data,
      request: async () => {
        calls++;
        return { text: "bad" };
      },
    });
    await service.run({
      id: "c",
      requestId: "r",
      prompt: "看图",
      images: [a.id],
      sendImages: true,
    });
    assert.equal(calls, 0);
    assert.match(
      f.store.data.chats[0].messages.at(-1).content,
      /目标模型已变更/,
    );
  } finally {
    await f.close();
  }
});
