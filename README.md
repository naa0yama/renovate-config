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

`.github/CODEOWNERS` ファイルを作成する、各プロジェクトで `assignees` を書いてもいいが、面倒なので `CODEOWNERS`
を利用する

Ref: [コードオーナーについて \- GitHub Docs](https://docs.github.com/ja/github/creating-cloning-and-archiving-repositories/about-code-owners)

```

* @naa0yama

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

* `prHourlyLimit` PRの作成を1時間に★回までに制限する
* `separateMinorPatch` パッチとマイナーアップグレードを同じ依存関係に対して別々のPRに分ける

* lockfile メンテナンス
    * スケジュールあり
    * automerge する

* パッチ(patch)
    * ラベル: `update-patch` をつける
    * まとめて PR にする
    * automerge する

* マイナー(minor)
    * ラベル: `update-minor` をつける

* メジャー(major)
    * ラベル: `update-major` をつける

### 定期実行

Renovate は何も指定しないと、24時間 Pull Req してくるので
設定が決まってきたらスケジュール実行すると良いです。

```json
{
  "schedule": ["before 3am"],
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


## Ref

* [Configuration Options \| Renovate Docs](https://docs.renovatebot.com/configuration-options/)
* [Full Config Presets \| Renovate Docs](https://docs.renovatebot.com/presets-config/)
* [Default Presets \| Renovate Docs](https://docs.renovatebot.com/presets-default/)
* [Managers \- Renovate Docs \| Renovate Docs](https://docs.renovatebot.com/modules/manager/)
* [Datasources \- Renovate Docs \| Renovate Docs](https://docs.renovatebot.com/modules/datasource/)


* [sugarshin/renovate\-config: My shareable config for Renovate](https://github.com/sugarshin/renovate-config)
* [Process Escape Characters in Release \`body\` · Issue \#25 · actions/create\-release](https://github.com/actions/create-release/issues/25)

## LICENSE

[AGPL 3.0](LICENSE)
