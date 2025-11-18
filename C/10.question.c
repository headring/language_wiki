#include <stdio.h>

// 1번: 20년 1회 14번
one() {
  int c=1;
  switch(3){
    case 1:c+=3;
    case 2:c++;
    case 3:c=0;
    case 4:c+=3;
    case 5:c-=10;
    default : c--;
    
  }
  printf("%d",c);
}
// 답: -8
// 결과: O


// 2번: 20년 1회 20번
void align(int a[]){
  int temp;
  for(int i=0;i<4;i++)
    for(int j=0;j<4-i;j++)
      if(a[j]>a[j+1]){
        temp=a[j];
        a[j]=a[j+1];
        a[j+1]=temp;
      }
}
two() {
  int a[]={85, 75, 50, 100, 95};
  align(a);
  for(int i=0;i<5;i++)
    printf("%d",a[i]);
}
// 답: 50, 75, 85, 95, 100
// 결과: 


// 3번: 20년 4회 10번
three() {
  char *p="KOREA";
  printf("%s\n",p);
  printf("%s\n",p+3);
  printf("%c\n",*p);
  printf("%c\n",*(p+3));
  printf("%c\n",*p+2);
}
// 답: K, E, KOREA, E, R
// 결과: X


// 4번: 21년 1회 15번
void four(){
  struct insa {
    char name[10];
    int age;
  }a[] = {"Kim",28,"Lee",38,"Park",42,"Choi",31};
  struct insa *p;
  p = a;
  p++;
  printf("%s\n", p-> name);
  printf("%d\n", p-> age);
}
// 답: X
// 결과: X


// 5번: 21년 2회 16번
int five(){
  int res;
  res = mp(2,10);
  printf("%d",res);
  return 0;
}
 
int mp(int base, int exp) {
  int res = 1;
  for(int i=0; i < exp; i++){
    res *= base;
  }
 
  return res;
}
// 답: 1024
// 결과: O 



// 6번: 21년 2회 18번
int six(){
  int ary[3]; // [1, 3, 4]
  int s = 0;
  *(ary+0)=1;
  ary[1] = *(ary+0)+2;
  ary[2] = *ary+3;
  for(int i=0; i<3; i++){
    s=s+ary[i];
  }
  printf("%d",s);
}
// 답: 10
// 결과: X



// 7번: 21년 3회 12번
int seven(){
  int *arr[3];
  int a = 12, b = 24, c = 36;
  arr[0] = &a;
  arr[1] = &b;
  arr[2] = &c;

  printf("%d\n", *arr[1] + **arr + 1);
}
// 답: 13
// 결과: X



// 8번: 21년 3회 17번 
struct jsu {
  char name[12];
  int os, db, hab, hhab;
};
 
int eight(){
  struct jsu st[3] = {{"데이터1", 95, 88},  {"데이터2", 84, 91},  {"데이터3", 86, 75}};
  struct jsu* p;
 
  p = &st[0]; // {"데이터1", 95, 88}
 
  (p + 1)->hab = (p + 1)->os + (p + 2)->db; // 84 + 75 = 159
  (p + 1)->hhab = (p+1)->hab + p->os + p->db; // 159 + 95 + 98 = 352
  printf("%d\n", (p+1)->hab + (p+1)->hhab);
}
// 답: 511
// 결과: XXXXX



// 9번: 22년 1회 12번
// 5를 입력받았을 때 출력 결과
int func(int a) {
  if(a<=1) return 1;
  return a*func(a-1);
}
int nine(){
  int a;
  scanf("%d",&a);
  printf("%d",func(a));
}
// 답: 120
// 결과: O


// 10번: 22년 1회 15번
// 아래 프로그램은 정수를 역순으로 출력하는데 (1)(2)(3)에 들어갈 연산자를 쓰시오
int ten() {
 
  int number = 1234;
  int div = 10;
  int result = 0;
 
  // while (number ( 1 ) 0) {
  //   result = result * div;
  //   result = result + number ( 2 ) div;
  //   number = number ( 3 ) div;
  // }
 
  printf("%d", result);
  return 0;
}
// 답: >, %, /
// 결과: O


// 11번: 22년 2회 8번
struct A{
  int n;
  int g;
};
int eleven() { 
  struct A a[2];
  for(int i=0;i<2;i++){
    a[i].n=i, a[i].g=i+1;
  }
  printf("%d",a[0].n+a[1].g);
}
// 답: 2
// 결과: O



// 12번: 22년 2회 15번
int len(char*p);
int tweleve(){
  char*p1 = "2022"; // 문자열을 사질 배열이고 이렇게 저장 ['2', '0', '2', '2', '\0'] => 뒤에 0이 자동 추가
  char*p2 = "202207";  
  
  int a = len(p1);
  int b = len(p2);
  
  printf("%d", a+b);
}

int len(char*p){
  int r = 0;
  while(*p != '\0'){
    p++;
    r++;
  }
  return r;
}
// 답: 10
// 결과: O........


// 25년 1회 19번 출력결과
typedef struct student {
  char* name;
  int score[3];
} Student;
int dec(int enc) {
  return enc & 0xA5;
}
int sum(Student* p) {
  return dec(p->score[0]) + dec(p->score[1]) + dec(p->score[2]);
}
 
int back5() {
  Student s[2] = { "Kim", {0xA0, 0xA5, 0xDB}, "Lee", {0xA0, 0xED, 0x81} };
  Student* p = s;
  int result = 0;
 
  for (int i = 0; i < 2; i++) {
    result += sum(&s[i]);
  }
  printf("%d", result);
  return 0;
}



// 25년 2회 12번
#define SIZE 3
 
typedef struct {
    int a[SIZE];
    int front;
    int rear;
} Queue;
 
void enq(Queue* q, int val){
    q->a[q->rear] = val; 
    q->rear = (q->rear + 1) % SIZE;
}
 
int deq(Queue* q) {
    int val = q->a[q->front];
    q->front = (q->front + 1) % SIZE;
    return val;
}
 
int back4() {
    Queue q = {{0}, 0, 0};
 
    enq(&q,1); // ->  q = {{1, 0}, 0, 0};
    enq(&q,2); // -> q = {{2, 1, 0}, 0, 0};
    deq(&q); 
    // int val = q->a[q->front]; ==> 2
    // q->rear = (q->rear + 1) % SIZE;
    enq(&q, 3); // -> q = {{3, 2, 1, 0}, 1, 0};
    
    int first = deq(&q);
    // int val = q->a[q->front]; ==> 0
    // q->rear = (q->rear + 1) % SIZE;
    int second = deq(&q);
    printf("%d 그리고 %d", first, second);
    
    return 0;
}
// 답: 3 그리고 2
// 결과: X



// 25년 2회 14번 출력결과
struct dat {
  int x;
  int y;
};
 
int back3() {
  struct dat a[] = {{1, 2}, {3, 4}, {5, 6}};
  struct dat* ptr = a;
  struct dat** pptr = &ptr;

  (*pptr)[1] = (*pptr)[2];
  printf("%d 그리고 %d", a[1].x, a[1].y);

  return 0;
}
// 답: 5 그리고 6
// 결과: O


// 25년 2회 16번
struct back2Node {
  int p;
  struct back2Node* n;
};
 
int back2() {
  struct back2Node a = {1, NULL};
  struct back2Node b = {2, NULL};
  struct back2Node c = {3, NULL};

  a.n = &b; b.n = &c; c.n = NULL;
  c.n = &a; a.n = &b; b.n = NULL;
  struct back2Node* head = &c;
  printf("%d %d %d", head->p, head->n->p, head->n->n->p);
  return 0;
}
// 답: 3 1 2
// 결과: O


// 25년 2회 18번
struct back1Node {
  char c;
  struct back1Node* p;
};
 
struct back1Node* func(char* s) {
  struct back1Node* h = NULL, *n;
    
  while(*s) {
    n = malloc(sizeof(struct back1Node));
    n->c = *s++;
    n->p = h;
    h = n;
  }
    
  return h;
}
 
int back1() {
  struct back1Node* n = func("BEST");
    
  while(n) {
    putchar(n->c);
    struct back1Node* t = n;
    n = n->p;
    free(t);
  }
    
  return 0;
}


int main(void){
  return;
}
// 답: ....
// 결과: XXX