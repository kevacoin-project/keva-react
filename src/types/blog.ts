export interface BlogPost {
  title: string;
  content: string;
  likes?: number;
  shares?: number;
  replies?: number;
  time?: number;
  height?: number;
  tx_hash?: string;
}

export interface RawKeyValue {
  tx_hash: any;
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

export interface ReactionSender {
  shortCode: string;
  displayName: string;
}

export interface ReactionReply {
  height: number;
  type: string;
  key: string;
  value: string;
  time: number;
  sender: ReactionSender;
}

export interface ReactionsData {
  key: string;
  value: string;
  displayName: string;
  shortCode: string;
  likes: number;
  replies: ReactionReply[];
  shares: number;
} 