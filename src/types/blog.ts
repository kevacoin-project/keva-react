export interface BlogPost {
  title: string;
  content: string;
}

export interface RawKeyValue {
  key: string;
  value: string;
  replies?: any;
  shares?: any;
  likes?: any;
  type?: any;
  time?: any;
  height?: any;
}

export interface KeyValueData {
  data: Array<RawKeyValue>;
  min_tx_num: number;
}

export interface Comment {
  id: number;
  author: string;
  content: string;
  date: string;
  postId: number;
} 