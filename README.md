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

| メジャー(major) | ミラー(minor) | パッチ(patch) | ビルド(build) |
| :-------------- | :------------ | :------------ | :------------ |
| 1               | 1             | 1             | 1             |


|          |       | description                                            |
| :------- | :---: | :----------------------------------------------------- |
| メジャー | major | 後方互換性がない変更の時にインクリメントする番号です。 |
| ミラー   | minor | 後方互換性がある変更の時にインクリメントする番号です。 |
| パッチ   | patch | バグ修正の時にインクリメントする番号です。             |
| ビルド   | build | 開発中などにビルドした時にインクリメントする番号です。 |


### 共通の設定

* 依存関係のバージョンで パッチ(patch) レベルは
    * automerge する
    * ラベル: `update-patch` をつける

* パッチ(patch)
    * ラベル: `update-patch` をつける
* ミラー(minor)
    * ラベル: `update-minor` をつける
* メジャー(major)
    * ラベル: `update-major` をつける

### パッケージごとの個別設定

主に SemVer に従ってなく `21.3.1` 21年.3月.1日 のようなバージョンで出してくる物やグループ化したいものを設定している


## LICENSE

[AGPL 3.0](LICENSE)
