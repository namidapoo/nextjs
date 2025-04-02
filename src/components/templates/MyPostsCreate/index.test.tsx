import * as MyPosts from "@/services/client/MyPosts/__mock__/msw";
import * as MyProfile from "@/services/client/MyProfile/__mock__/msw";
import { mockUploadImage } from "@/services/client/UploadImage/__mock__/jest";
import { selectImageFile, setupMockServer } from "@/tests/jest";
import { composeStories } from "@storybook/testing-react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockRouter from "next-router-mock";
import * as stories from "./index.stories";

const { Default } = composeStories(stories);
const user = userEvent.setup();

async function setup() {
  // テスト対象のコンポーネントをレンダリング
  const { container } = render(<Default />);
  // 画像アップロードのモック
  const { selectImage } = selectImageFile();
  // 記事タイトルを入力するインタラクション関数
  async function typeTitle(title: string) {
    const textbox = screen.getByRole("textbox", { name: "記事タイトル" });
    await user.type(textbox, title);
  }
  // 記事を公開するインタラクション関数
  async function saveAsPublished() {
    await user.click(screen.getByRole("switch", { name: "公開ステータス" }));
    await user.click(screen.getByRole("button", { name: "記事を公開する" }));
    await screen.findByRole("alertdialog");
  }
  // 記事を下書き保存するインタラクション関数
  async function saveAsDraft() {
    await user.click(screen.getByRole("button", { name: "下書き保存する" }));
  }
  // アラートダイアログのボタンをクリックするインタラクション関数
  async function clickButton(name: "はい" | "いいえ") {
    await user.click(screen.getByRole("button", { name }));
  }
  return {
    container,
    typeTitle,
    saveAsPublished,
    saveAsDraft,
    clickButton,
    selectImage,
  };
}

// モックサーバーのセットアップ
setupMockServer(...MyPosts.handlers, ...MyProfile.handlers);
beforeEach(() => {
  // 画像アップロードのモック
  mockUploadImage();
  // 初期URLのセット
  mockRouter.setCurrentUrl("/my/posts/create");
});

describe("AlertDialog", () => {
  test("公開を試みた時、AlertDialog が表示される", async () => {
    // セットアップと公開アクションの実行
    const { typeTitle, saveAsPublished, selectImage } = await setup();
    await typeTitle("201");
    await selectImage();
    await saveAsPublished();
    // ダイアログが表示されていることを確認
    expect(
      screen.getByText("記事を公開します。よろしいですか？")
    ).toBeInTheDocument();
  });

  test("「いいえ」を押下すると、AlertDialog が閉じる", async () => {
    // セットアップと公開アクションの実行
    const { typeTitle, saveAsPublished, clickButton, selectImage } =
      await setup();
    await typeTitle("201");
    await selectImage();
    await saveAsPublished();
    // 「いいえ」ボタンをクリック
    await clickButton("いいえ");
    // ダイアログが閉じていることを確認
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  test("不適正内容で送信を試みると、AlertDialog が閉じる", async () => {
    // セットアップと公開アクションの実行（タイトル未入力）
    const { saveAsPublished, clickButton, selectImage } = await setup();
    // await typeTitle("201");　タイトルが入力されていない
    await selectImage();
    await saveAsPublished();
    // 「はい」ボタンをクリック
    await clickButton("はい");
    // バリデーションエラーが表示されるまで待機
    await waitFor(() =>
      expect(
        screen.getByRole("textbox", { name: "記事タイトル" })
      ).toBeInvalid()
    );
    // ダイアログが閉じていることを確認
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});

describe("Toast", () => {
  test("API 通信を開始した時「保存中…」が表示される", async () => {
    // セットアップと公開アクションの実行
    const { typeTitle, saveAsPublished, clickButton, selectImage } =
      await setup();
    await typeTitle("201");
    await selectImage();
    await saveAsPublished();
    await clickButton("はい");
    // 「保存中…」のトースト表示を確認
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("保存中…")
    );
  });

  test("公開に成功した場合「公開に成功しました」が表示される", async () => {
    // セットアップと公開アクションの実行
    const { typeTitle, saveAsPublished, clickButton, selectImage } =
      await setup();
    await typeTitle("hoge");
    await selectImage();
    await saveAsPublished();
    await clickButton("はい");
    // 「公開に成功しました」のトースト表示を確認
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("公開に成功しました")
    );
  });

  test("公開に失敗した場合「公開に失敗しました」が表示される", async () => {
    // セットアップと公開アクションの実行（失敗ケース用のタイトル "500" を使用）
    const { typeTitle, saveAsPublished, clickButton, selectImage } =
      await setup();
    await typeTitle("500");
    await selectImage();
    await saveAsPublished();
    await clickButton("はい");
    // 「公開に失敗しました」のトースト表示を確認
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("公開に失敗しました")
    );
  });
});

describe("画面遷移", () => {
  test("下書き保存した場合、下書きした記事ページに遷移する", async () => {
    // セットアップと下書き保存アクションの実行
    const { typeTitle, saveAsDraft, selectImage } = await setup();
    await typeTitle("201");
    await selectImage();
    await saveAsDraft();
    // 記事詳細ページへの遷移を確認
    await waitFor(() =>
      expect(mockRouter).toMatchObject({ pathname: "/my/posts/201" })
    );
  });

  test("公開に成功した場合、画面遷移する", async () => {
    // セットアップと公開アクションの実行
    const { typeTitle, saveAsPublished, clickButton, selectImage } =
      await setup();
    await typeTitle("201");
    await selectImage();
    await saveAsPublished();
    await clickButton("はい");
    // 記事詳細ページへの遷移を確認
    await waitFor(() =>
      expect(mockRouter).toMatchObject({ pathname: "/my/posts/201" })
    );
  });
});
