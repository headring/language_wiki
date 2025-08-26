#include <stdio.h>

int main(void){
  int x;
  x= 10;

  // 주소를 할당한다
  int *p;
  p = &x;
  printf("주소 내부의 값은 %d \n", *p);

  int s[3] = {1, 2, 3};
  // s[0] 또는 *s === 1
  // s[1] 또는 *(s+1) === 2
  // s[2] 또는 *(s+2) === 3

  printf("배열 내부의 값은 %d \n", *(s+1));
 
  return 0;

}
