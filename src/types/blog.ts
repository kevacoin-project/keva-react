export interface BlogPost {
  id: number;
  title: string;
  content: string;
  date: string;
  author: string;
}

export interface Comment {
  id: number;
  author: string;
  content: string;
  date: string;
  postId: number;
} 