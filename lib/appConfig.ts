/*
 * アプリに内蔵する同期先（Firebase Realtime Database のURL）。
 *
 * ここにURLを入れておくと、利用者は「合言葉」を入れるだけで同期できる。
 * 空のままだと、各端末でデータベースURLを入力する必要がある。
 *
 * このURLは秘密の鍵ではなく、アプリが接続する宛先の住所にあたる。
 * 部屋の中身を守っているのは合言葉なので、公開のコードに書いて問題ない。
 *
 * 例: 'https://xxxx-default-rtdb.asia-southeast1.firebasedatabase.app'
 */
export const SYNC_DB_URL = 'https://balblanc-2026-default-rtdb.asia-southeast1.firebasedatabase.app';
