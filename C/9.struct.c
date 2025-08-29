#include <stdio.h>

// 선언 중괄호 앞에 있는 것이 구조체의 이름
struct student_info{
  int number;
  char name[20];
  int age;
};

// 선언 후 뒤에 붙인느 것이 구조체의 별명
typedef struct
{
  int number;
  char name[20];
  int age;
}student;

int main(void){
  struct student_info s = {1, "wow", 12};
  student typeS = {1, "wow", 12};

  /** 구조제 접근법 */
  // 일반 접근
  printf("printing %d", s.age);

  // 포인터 접근
  student *typePtr = &typeS;
  printf("printing %d", typePtr->age);
  printf("printing %d", (*typePtr).age);

  return 0;

}
