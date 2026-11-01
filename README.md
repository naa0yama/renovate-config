# renovate-config

[![GitHub last commit](https://img.shields.io/github/last-commit/naa0yama/renovate-config.svg)](https://github.com/naa0yama/renovate-config)
![GitHub](https://img.shields.io/github/license/naa0yama/renovate-config)

[Renovate's Shareable Config Presets](https://docs.renovatebot.com/config-presets/)

## How to use

`renovate.exsample.json` をレポジトリーからコピーして配置してください

レポジトリールートで下記コマンドでも可

```shell
curl -sfSL https://raw.githubusercontent.com/naa0yama/renovate-config/main/renovate.exsample.json \
    -o renovate.json
```

## 設定

SemVer の考え方

| メジャー(major) | マイナー(minor) | パッチ(patch) | ビルド(build) |
| :-------------- | :-------------- | :------------ | :------------ |
| 1               | 1               | 1             | 1             |

|          |       | description                                            |
| :------- | :---: | :----------------------------------------------------- |
| メジャー | major | 後方互換性がない変更の時にインクリメントする番号です。 |
| マイナー | minor | 後方互換性がある変更の時にインクリメントする番号です。 |
| パッチ   | patch | バグ修正の時にインクリメントする番号です。             |
| ビルド   | build | 開発中などにビルドした時にインクリメントする番号です。 |

### 共通の設定

- `assignees` Pull Request のアサイン者リスト

```json
{
	"assignees": [
		"@naa0yama"
	]
}
```

- `prHourlyLimit` PRの作成を1時間に★回までに制限する
- `separateMinorPatch` パッチ(patch) とマイナー(minor) アップグレードを同じ依存関係に対して別々のPRに分ける

- lockfile メンテナンス
  - automerge する

- pin のリクエスト
  - automerge する

- パッチ(patch)
  - ラベル: `update-patch` をつける
  - まとめて PR にする
  - automerge する

- マイナー(minor)
  - ラベル: `update-minor` をつける
  - crate (cargo) / mise ツール / Dockerfile syntax / CalVer バージョン は CI ゲート通過を条件に automerge する
  - rust toolchain / GitHub Actions major / crate major は手動マージ

- メジャー(major)
  - ラベル: `update-major` をつける

### 定期実行

Renovate は何も指定しないと、24時間 Pull Req してくるので
設定が決まってきたらスケジュール実行すると良いです。

```json
{
	"schedule": ["before 3am"]
}
```

### config:base

Renovate では、 `config:base` という便利設定を出してるが、一部無効にしたい設定があるので
ここに書く

| key                                                                                                                 | description                                                                                                                  |
| :------------------------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------- |
| [:automergeDisabled](https://docs.renovatebot.com/presets-default/#automergedisabled)                               | automerge 機能を無効にして、人間がすべてのPRをマージするのを待つ。                                                           |
| [:autodetectPinVersions](https://docs.renovatebot.com/presets-default/#autodetectpinversions)                       | 依存関係を固定するか、範囲を維持するかを自動検出する                                                                         |
| [:separateMajorReleases](https://docs.renovatebot.com/presets-default/#separatemajorreleases)                       | 依存関係にあるメジャーバージョンを個々のブランチ/PRに分ける                                                                  |
| [:combinePatchMinorReleases](https://docs.renovatebot.com/presets-default/#combinepatchminorreleases)               | パッチとマイナーアップグレードを同じ依存関係に対して別々のPRに分けない                                                       |
| [:ignoreUnstable](https://docs.renovatebot.com/presets-default/#ignoreunstable)                                     | 既存のバージョンが不安定な場合のみ、不安定なバージョンにアップグレードする                                                   |
| [:ignoreModulesAndTests](https://docs.renovatebot.com/presets-default/#ignoremodulesandtests)                       | `node_modules`, `bower_components`, `vendor` および各種 `test/tests` ディレクトリを無視します。                              |
| [:semanticPrefixFixDepsChoreOthers](https://docs.renovatebot.com/presets-default/#semanticprefixfixdepschoreothers) | セマンティックコミットが検出された場合、セマンティックコミットのタイプは、依存関係にはfixを、それ以外にはchoreを使用します。 |
| [:updateNotScheduled](https://docs.renovatebot.com/presets-default/#updatenotscheduled)                             | スケジュールされていない場合でも、既存のブランチを常に更新                                                                   |
| [:prHourlyLimit2](https://docs.renovatebot.com/presets-default/#prhourlylimit2)                                     | PRの作成を1時間に2回までに制限する                                                                                           |
| [:prConcurrentLimit20](https://docs.renovatebot.com/presets-default/#prconcurrentlimit20)                           | 同時に最大20個のPRを開くことができます                                                                                       |
| [:prImmediately](https://docs.renovatebot.com/presets-default/#primmediately)                                       | ブランチを作成した後、すぐにPRを出す                                                                                         |
| [group:monorepos](https://docs.renovatebot.com/presets-group/#groupmonorepos)                                       | 既知のmonorepoパッケージをグループ化                                                                                         |
| [group:recommended](https://docs.renovatebot.com/presets-group/#grouprecommended)                                   | モノレポではないパッケージグループの推奨リストを使用する。                                                                   |
| [helpers:disableTypesNodeMajor](https://docs.renovatebot.com/presets-helpers/#helpersdisabletypesnodemajor)         | Node.js の @types/node のメジャーアップデートを無効にする                                                                    |
| [workarounds:all](https://docs.renovatebot.com/presets-workarounds/#workaroundsall)                                 | パッケージの既知の問題に対する回避策のコレクション                                                                           |

### パッケージごとの個別設定

主に SemVer に従ってなく `21.3.1` 21年.3月.1日 のようなバージョンで出してくる物やグループ化したいものを設定している

### nix preset

`extends/nix.json` は、`flake.nix` の input を commit に固定したまま、branch の先頭に上げる preset です。
`default.json` の extends から読み込まれます。
提案される rev は、branch の先頭になってから 7 日以上たったものだけです。
この 7 日は `default.json` の `minimumReleaseAge` から来ます。

#### 注記の書式

更新したい input の `url` 行の直前に、次の形式のコメントを 1 行置きます。
値は空白で区切り、各値は空白を含みません。
key は次の表の順 (`datasource`、`depName`、`packageName`、`branch`、`version`) に固定です。

| key           | 内容                                                                      |
| :------------ | :------------------------------------------------------------------------ |
| `datasource`  | `custom.github-branch-tip` を指定する                                     |
| `depName`     | 依存の名前                                                                |
| `packageName` | GitHub の `<owner>/<repo>`                                                |
| `branch`      | 追う branch 名                                                            |
| `version`     | 現在の rev が branch の先頭になった UTC 時刻 `YYYY.MM.DD.HH.MM.SS` (6 欄) |

```nix
{
  inputs = {
    # renovate: datasource=custom.github-branch-tip depName=nixpkgs packageName=NixOS/nixpkgs branch=nixpkgs-unstable version=2026.01.02.03.04.05
    nixpkgs.url = "github:NixOS/nixpkgs/0123456789abcdef0123456789abcdef01234567";

    example-lib = {
      # renovate: datasource=custom.github-branch-tip depName=example-lib packageName=NixOS/nixpkgs branch=nixos-unstable version=2026.02.03.04.05.06
      url = "github:NixOS/nixpkgs/89abcdef0123456789abcdef0123456789abcdef";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };
}
```

- `url` は `github:<owner>/<repo>/<40 桁の commit SHA>` の形にします
- `<name>.url = "..."` 形と、`<name> = { url = "..."; }` 形のどちらも対象です
- 注記の無い input は更新されません

#### 注記の位置の制約

注記は `url` 行の直前の行に置きます。
位置が違うと regex に一致せず、その input は更新されません。
たとえば `url` 行の前に別の属性 (`inputs.<name>.follows` など) の行が挟まる場合です。

key の順を変えた注記も同じ理由で抽出されず、renovate はエラーを出しません。
その input は黙って更新されなくなります。
この状態は `task accept:compare` が `missing lookup row or plan line` の MISMATCH として拾います。
ただし `accept:compare` が検査するのは、`ACCEPT_SOURCE` の repo (未指定なら既定の参照元 repo) の `flake.nix` だけです。
この repo 自身の `flake.nix` は検査しません。

#### 検査と受け入れの task

どの task も `PATH` に `nix` が必要です。
`nix` が無いと task は exit 非 0 で止まります。
node と yarn は task が `nix shell` で取得します。

| task                                         | 内容                                                                                                       |
| :------------------------------------------- | :--------------------------------------------------------------------------------------------------------- |
| `check:staged` / `check:merge` / `check:all` | 対象の JSON を `renovate-config-validator --strict` で検証し、`node --test` と `bats` を流す               |
| `accept:lookup`                              | 参照元 repo の clone に `renovate --dry-run=lookup` をかけ、dep ごとの結果と更新される branch の一覧を出す |
| `accept:compare`                             | 同じ clone で `devkit-flake-pin update` を走らせ、`accept:lookup` の結果と突き合わせる                     |

受け入れの判定と renovate の config 生成は `scripts/accept.mjs` が担います。
lookup と比較の shell は `scripts/accept-lookup.sh` と `scripts/accept-compare.sh` にあります。
`tests/` の `node --test` (`tests/*.test.mjs`) と `bats` (`tests/*.bats`) がこれらを検査します。

```shell
task check:all
task accept:lookup
task accept:compare
```

- `check:*` の 3 task は同じ検査本体を呼びます
- `accept:lookup` の branch 一覧は、renovate の trace の log にある `generateBranchConfig` の entry から作ります
- `accept:lookup` と `accept:compare` は network、ssh、`gh auth token` で取れる GitHub token を使います
- token が取れないと、どちらも exit 非 0 で止まります
- どちらも `check:all` には含まれません
- `accept:compare` は `nix develop` で参照元の devkit を使います
- 参照元は環境変数 `ACCEPT_SOURCE` に git の URL を渡すと変えられます。未指定のときは `scripts/accept-lookup.sh` と `scripts/accept-compare.sh` に書かれた既定の repo を使います

```shell
ACCEPT_SOURCE=git@github.com:example-org/example-repo.git task accept:lookup
```

## extends

- 各言語の設定を作成する
  - ファイル名は、 `extends/group/<language>.json`

## Ref

- [Configuration Options \| Renovate Docs](https://docs.renovatebot.com/configuration-options/)
- [Full Config Presets \| Renovate Docs](https://docs.renovatebot.com/presets-config/)
- [Default Presets \| Renovate Docs](https://docs.renovatebot.com/presets-default/)
- [Managers \- Renovate Docs \| Renovate Docs](https://docs.renovatebot.com/modules/manager/)
- [Datasources \- Renovate Docs \| Renovate Docs](https://docs.renovatebot.com/modules/datasource/)
- [sugarshin/renovate\-config: My shareable config for Renovate](https://github.com/sugarshin/renovate-config)
- [Process Escape Characters in Release \`body\` · Issue \#25 · actions/create\-release](https://github.com/actions/create-release/issues/25)
- [hatena/renovate\-config: A shareable config preset for Renovate used in Hatena\.](https://github.com/hatena/renovate-config)

## LICENSE

[AGPL 3.0](LICENSE)
