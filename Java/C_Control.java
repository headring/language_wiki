public class C_Control{

  public static void main(String[] args) {
    ifControl();
  }

  // if문
  public static void ifControl(){
    boolean hasCard = true;
    ArrayList<String> pocket = new ArrayList<String>();
    pocket.add("paper");
    pocket.add("handphone");
    pocket.add("money");

    if (pocket.contains("money")) {
      System.out.println("택시를 타고 가라");
    }else if(hasCard) {
      System.out.println("택시를 타고 가라");
    }else {         
      System.out.println("걸어가라");
    }


  }

  public static void switchCaseContorl(){
    int month = 8;
    String monthString = "";
    switch (month) {  // 입력 변수의 자료형은 byte, short, char, int, enum, String만 가능하다.
      case 7:  monthString = "July";
        break;
      case 8:  monthString = "August";
        break;
      case 9:  monthString = "September";
        break;
      default: monthString = "Invalid month";
        break;
    }
    System.out.println(monthString);
  }
  

  public static void whileControl(){
    int treeHit = 0;

    // 여기에는 continue랑 break도 있음
    while (treeHit < 10) {
      treeHit++;  // treeHit += 1 로도 표현 가능
      System.out.println("나무를  " + treeHit + "번 찍었습니다.");
      if (treeHit == 10) {
        System.out.println("나무 넘어갑니다.");
      }
    }

  }


  public static void forControl(){
    String[] numbers = {"one", "two", "three"};
    for(int i=0; i<numbers.length; i++) {
      System.out.println(numbers[i]);
    }

    // for each 문
    for(String number: numbers) {
      System.out.println(number);
    }

  }


}