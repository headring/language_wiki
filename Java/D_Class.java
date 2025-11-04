public class D_Java{
  // 메서드
  int sum(int a, int b){
    return a + b;
  }

  void sumVoid(int a, int b) {
      System.out.println(a+"과 "+b+"의 합은 "+(a+b)+"입니다.");
  }


  // JS랑 동일함
  // 원시 자료형(int, boolean, char 등): 값에 의한 호출로 동작하므로 메서드 내에서 값을 변경해도 원본에 영향 없음
  // 객체(배열, 문자열, 사용자 정의 클래스 등): 참조에 의한 호출로 동작하므로 메서드 내에서 객체의 속성을 변경하면 원본 객체에도 영향을 줌
  class Updater {
    void update(Counter counter) {
        counter.count++;
    }
  }
  class Counter {
    int count = 0;  // 객체변수
  }


  /** 상속 */
  // 메서드 오바라이딩 & 메서드 오버로딩
  class Animal {
    String name;

    void setName(String name) {
        this.name = name;
    }
  }
  class Dog extends Animal {
    void sleep() {
        System.out.println(this.name + " zzz");
    }
  } 
  class HouseDog extends Dog {
    // 동일한 형태(즉, 입출력이 동일)의 sleep 메서드를 구현하면 "오버라이딩"
    void sleep() {
        System.out.println(this.name + " zzz in house");
    }
  }
  class HouseDog2 extends Dog {
    void sleep() {
        System.out.println(this.name + " zzz in house");
    }
    // sleep이 있지만 매개변수가 다를 경우 "오버로딩"
    void sleep(int hour) {
        System.out.println(this.name + " zzz in house for " + hour + " hours");
    }
  }
  public class Sample {
    public static void main(String[] args) {
        HouseDog houseDog = new HouseDog();
        houseDog.setName("happy");
        houseDog.sleep();  // happy zzz in house 출력

    }
  }


  // 생성자 함수: 클래스명과 메서드명이 같으며 && 리턴 타입을 정의X
  class HouseDog3 extends Dog {
    // 자바가 컴파일될 때 생성자가 없으면 HouseDog3() 이런식으로 디폴트 생성자를 넣음
    HouseDog3(String name){
      this.setName(name);
    }

    void sleep() {
        System.out.println(this.name + " zzz in house");
    }
    // sleep이 있지만 매개변수가 다를 경우 "오버로딩"
    void sleep(int hour) {
        System.out.println(this.name + " zzz in house for " + hour + " hours");
    }
  }
  public class constructorSample {
    public static void main(String[] args) {
        HouseDog3 houseDog3 = new HouseDog3("happy");
    }
  }


  // 생성자 오버로딩
  class HouseDog4 extends Dog {
    HouseDog4(String name){
      this.setName(name);
    }
    HouseDog4(int type){
      if (type == 1) {
        this.setName("yorkshire");
      } else if (type == 2) {
        this.setName("bulldog");
      }
    }

    void sleep() {
        System.out.println(this.name + " zzz in house");
    }
    // sleep이 있지만 매개변수가 다를 경우 "오버로딩"
    void sleep(int hour) {
        System.out.println(this.name + " zzz in house for " + hour + " hours");
    }
  }
  public class constructorOverload {
    public static void main(Stirng[] args){
      HouseDog happy = new HouseDog("happy");
      HouseDog yorkshire = new HouseDog(1);
      System.out.println(happy.name);  // happy 출력
      System.out.println(yorkshire.name);  // yorkshire 출력
    }
  }


  // intefrace
  interface Predator {
    // 인터페이스의 메서드는 메서드의 이름과 입출력에 대한 정의만 있고 그 내용은 없다
    String getFood();

    // 디폴트 메서드: Predator 인터페이스를 구현한 Tiger, Lion 등의 실제 클래스는 printFood 메서드를 구현하지 않아도 사용가능
    default void printFood() {
      System.out.printf("my food is %s\n", getFood());
    }
  }
  class Animal2 {
    String name;

    void setName(String name) {
        this.name = name;
    }
  }
  class Tiger extends Animal implements Predator {
    public String getFood() {
      return "apple";
    }
  }

  class Lion extends Animal implements Predator {    
    public String getFood() {
      return "banana";
    }
  }
  class ZooKeeper {
    void feed(Predator predator) {
      System.out.println("feed "+predator.getFood());
    }
  }


  
  // 추상 클래스: 인터페이스의 역할  + 클래스 기능
  // 추상 클래스는 일반 클래스와 달리 단독으로 객체를 생성할 수 없다. 반드시 추상 클래스를 상속한 실제 클래스를 통해서만 객체를 생성할 수 있다.
  abstract class Predator2 extends Animal {
    abstract String getFood();

    void printFood() { 
        System.out.printf("my food is %s\n", getFood());
    }
}

  public static void main(String[] args){

  }
};