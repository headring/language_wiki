public class E_Question{
  public static void main(String[] args){

  }
}

// 1번 문제: 20년 1회
class Main {  
  static int[] arr() { 
    int a[]=new int[4];
    int b = a.length;
    for(int i =0; i<b;i++)
      a[i]=i;
    return a;
  } 
 
  public static void main(String args[]) { 
    int a[]=arr();
    for(int i =0; i< a.length; i++)
      System.out.print(a[i]+" ");
  } 
}
// 답: 0 1 2 3
// 결과: O


// 2번 문제: 20년 2회
class Parent{
  void show(){System.out.println("parent");}  
}
class Child extends Parent{
  void show() {System.out.println("child");}
}
 
class Main {  
  public static void main(String args[]) { 
    Parent pa=(가) Child();
    pa.show();
  }
}
// 답: new
// 결과: O


// 3번 문제: 20년 3회
public class Main{
	public static void main(String[] args){
    int i=0, c=0;
    while (i<10){
      i++;
      c*=i;
    }
    System.out.println(c);
  }
}
// 답: 0
// 결과: O


// 4번 문제: 20년 3회 15번
abstract class Vehicle{
	String name;
  abstract public String getName(String val);
  public String getName(){
    return "Vehicle name:" + name;
  }
}
 
class Car extends Vehicle{
  private String name;
	public Car(String val){
    name=super.name=val;
  }
  public String getName(String val){
	  return "Car name : " + val;
  }
  public String getName(byte val[]){
	  return "Car name : " + val;
  }
}
 
public class Main {
	public static void main(String[] args){
    Vehicle obj = new Car("Spark");
    System.out.print(obj.getName());
    }
}
// 답: Car name Spark
// 결과: X


// 5번 문제: 20년 3회 17번
public class Main {
	public static void main(String[] args){
    int i=0, sum=0;
    while (i<10){
    	i++;
      if(i%2 ==1)
        continue;
      sum += i;
     }
    System.out.println(sum);
   }
}
// 답: 2 + 4 + 6 + 8 = 20 -> 10까지 가는 것을 안 했네....
// 결과: X 


// 6번 문제: 20년 4회 7번
// 7번 다음은 변수 n에 저장된 10진수를 2진수로 변환하여 출력하는 java프로그램이다. 
// 프로그램을 분석하여 ( 1번 )( 2번 )빈칸에 알맞은 답을 쓰시오
class Main {
	public static void main (String[] args) {
    int[]a = new int[8];
    int i=0; int n=10;
    // while (  1번 ) {
    //   a[i++] = ( 2번 );
    //   n /= 2;
    // }
    for(i=7; i>=0; i--){
      System.out.print(a[i]);
    }
  }
}
// 답: .....
// 결과: X 


// 8번 문제: 20년 4회 8번
// 가, 나의 답을 쓰시오.
public class Main { 
	public static void main(String[] args) {
    int ary[][] = new int[가][나];

    for(int i = 0; i <3; i++){
      for(int j=0; j < 5; j++){
        ary[i][j] = j*3+(i+1);
        System.out.print(ary[i][j]+"");
      }
      System.out.println();
    }
  }
}
// 답: 3, 5
// 결과: O


// 9번 문제: 20년 4회 19번
class Parent{
	public int compute(int num){
    	if(num <=1) return num;
      return compute(num-1) + compute(num-2);
    }
}
 
class Child extends parent {
 	public int compute(int num){
    if(num<=1) return num;
    return compute(num-1) + compute(num-3);
  }
}
   
class Main{
  public static void main (String[] args){
    Parent obj = new Child();
    System.out.print(obj.compute(4));
  }
}

// (4) compute(3) + compute(1)
// (3) compute(2) + compute(0) | 1
// (2) compute (1) + compute (-1) | + 0 | 1

// 답: 2
// 결과: X



// 10번 문제: 21년 1회 7번
public class Main{
	public static void main(String[] args){
    int arr[][] = new int[][]{{45,50,75},{89}};
    System.out.println(arr[0].length);
    System.out.println(arr[1].length);
    System.out.println(arr[0][0]);
    System.out.println(arr[0][1]);
    System.out.println(arr[1][0]);
  }
}
// 답: 3, 1, 45, 50, 89
// 결과: O



// 11번 문제: 21년 1회 17번
public class Main {
	public static void main(String[] args){
    int i, j;
    for(j=0, i=0; i<=5; i++){
      j+=i;
      System.out.print(i);
      if(i==5){
        System.out.print("=");
        System.out.print(j);
      } else{
   	    System.out.print("+");
	  }
   }
  }
}

// 답: 0 + 1 + 2 + 3 + 4 + 5 = 15
// 결과: O


// 12번 문제: 21년 2회 17번
public class Main {
   public static void main(String[] args){
      System.out.print(Main.check(1));
   }
   
  // (가) String check (int num) {
  //   return (num >= 0) ? "positive" : "negative";
  //  }
}
// 답: public
// 결과: X


// 13번 문제: 21년 2회 19번
public class ovr1 {
	public static void main(String[] args){
    	ovr1 a1 = new ovr1();
        ovr2 a2 = new ovr2();
        System.out.println(a1.sun(3,2) + a2.sun(3,2));
        // 5
    }
    
    int sun(int x, int y){
    	return x + y;
    }
}
class ovr2 extends ovr1 {
 
	int sun(int x, int y){
    	return x - y + super.sun(x,y);
    }
 
}
// 답: 11
// 결과: O


// 14번 문제: 21년 3회 1번
class Connection {
  private static  Connection _inst = null;
  private int count = 0;

  public static Connection get() {
    if(_inst == null) {
      _inst = new Connection();
      return _inst; 
    }
    return _inst;
  }
  public void count() { count ++; }
  public int getCount() { return count; }
}
 
public class Main {
  public static void main(String[] args) {
    Connection conn1 = Connection.get();
    conn1.count();
    Connection conn2 = Connection.get();
    conn2.count();
    Connection conn3 = Connection.get();
    conn3.count();
    
    System.out.print(conn1.getCount());
  }
}
// 답: 1
// 결과: X



// 15번 문제: 21년 3회 11번
public class Main{
 public static void main(String[] args) {
  int a = 3, b = 4, c = 3, d = 5;
  if((a == 2 | a == c) & !(c > d) & (1 == b ^ c != d)) {
   a = b + c;
    if(7 == b ^ c != a) {
     System.out.println(a);
    } else {
    System.out.println(b);
    }
  } else {
    a = c + d;
    if(7 == c ^ d != a) {
    System.out.println(a);
    } else {
    System.out.println(d);
    }
  }
 }
}
// 답: 7
// 결과: O


// 16번 문제: 22년 1회 1번
class A {
  int a;
  int b;
}
public class Main {
  static void func1(A m){
   m.a *= 10;
  }
  static void func2(A m){
    m.a += m.b;
  }
  
  public static void main(String args[]){
  
    A m = new A();
    
    m.a = 100;
    func1(m);
    m.b = m.a;
    func2(m);
    
    System.out.printf("%d", m.a);
  
  }
}
// 답: 2000
// 결과: O



// 17번 문제: 22년 1회 5번
class Car implements Runnable{
  int a;
  
  public void run(){
    try{
      while(++a<100){
        System.out.println("miles traveled :" +a);
        Thread.sleep(100);
      }
    }
     catch(Exception E){}
  }
}
  
public class Main{
  public static void main(String args[]){
    // Thread t1 = new Thread(new (가)());
    // t1.start();
  }
}
// 답: Car
// 결과: O



// 18번 문제: 22년 2회 17번
class Conv{
  public Conv(int a){
    this.a=a;
  }
  int func(){
    int b=1;
    for(int i =1;i<a;i++){
      b=a*i+b;
    }
    return a+b;
  }
}
 
public class Main {  
  public static void main(String args[]) { 
    Conv obj=new Conv(3);
    obj.a=5;
    int b=obj.func();
    System.out.print(obj.a+b);
  } 
}
// 답: 41
// 결과: X


// 19번 문제: 22년 3회 4번
public class Test{
 public static void main(String[] args){
  int[] result = new int[5];
  int[] arr = {77,32,10,99,50};

  for(int i = 0; i < 5; i++) {
    result[i] = 1;
    for(int j = 0; j < 5; j++) {
      if(arr[i] <arr[j]) 
        result[i]++;
    }
  }
 
  for(int k = 0; k < 5; k++) {
    printf(result[k]);
   }
 }
}
// 답: 2, 4, 5, 1, 3
// 결과: O


// 20번 문제: 22년 3회 19번
public class Main {
  static int[] MakeArray(){
    int[] tempArr = new int[4];
    for(int i=0; i<tempArr.Length;i++){
      tempArr[i] = i;
    }
    return tempArr;
  }
  
  public static void main(String[] args){
    int[] intArr; 
    intArr = MakeArray();
  
    for(int i=0; i < intArr.Length; i++)
      System.out.print(intArr[i]);
  }
}
// 답: 0, 1, 2, 3
// 결과: O




// 25년 1회 13번 출력결과
public class Main {
  public static void main(String[] args) {
    new Child();
    System.out.println(Parent.total);
  }
}
class Parent {
  static int total = 0;
  int v = 1;
  public Parent() {
    total += (++v);
    show();    
  }
  public void show() {
    total += total;
  }
} 
class Child extends Parent {
  int v = 10;
  // !생성자 함수!
  public Child() {
      v += 2;  // V = 12
      total += v++;  // total = 13
      show();
  }
  @Override
  public void show() {
    total += total * 2; // total = 39
  }
}
// 값: 0
// 결과: X


// 25년 1회 16번 출력결과
public class Main {
 
  public static void main(String[] args) {
    int[] data = {3, 5, 8, 12, 17};
    System.out.println(func(data, 0, data.length - 1));
  }
 
  static int func(int[] a, int st, int end) {
    if (st >= end) return 0;
    int mid = (st + end) / 2;
    return a[mid] + Math.max(func(a, st, mid), func(a, mid + 1, end));
  } 
}
// 답: 16
// 결과: X


// 25년 1회 20번 출력결과
public class Main {
  public static void main(String[] args) {
    System.out.println(calc("5"));
  }
 
  static int calc(int value) {
    if (value <= 1) return value;
    return calc(value - 1) + calc(value - 2);
  }
 
  static int calc(String str) {
    int value = Integer.valueOf(str);
    if (value <= 1) return value;
    return calc(value - 1) + calc(value - 3);
  }
}
// 답: 6
// 결과: X


// 25년 2회 5번 출력결과
public class Main {
  public static void change(String[] data, String s){
    data[0] = s;
    s = "Z";
  }
  
  public static void main(String[] args) {
    String data[] = { "A" };
    String s = "B";
    
    change(data, s);
    System.out.print(data[0] + s);
  }
}
// 답: BB
// 결과: O


// 25년 2회 9번 출력결과
public class Main {
  static interface F {
    int apply(int x) throws Exception;
  }
 
  public static int run(F f) {
    try {
        return f.apply(3);
    } catch (Exception e) {
        return 7;
    }
  }
 
  public static void main(String[] args) {
    F f = (x) -> {
      if (x > 2) {
        throw new Exception();
      }
      return x * 2;
    };
    System.out.print(run(f) + run((int n) -> n + 9));
  }
}
// 답: 19
// 결과: O


// 25년 2회 10번 출력결과
public class Main{
  public static class Parent {
    public int x(int i) { return i + 2; }
    public static String id() { return "P";}
  }

  public static class Child extends Parent {
    public int x(int i) { return i + 3; }
    public String x(String s) { return s + "R"; }
    public static String id() { return "C"; }
  }

  public static void main(String[] args) {
    Parent ref = new Child();
    System.out.println(ref.x(2) + ref.id());
  }
}
// 답: 5C
// 결과: X



// 25년 2회 15번 출력결과
public class Main{
  public static class BO {
    public int v;
    public BO(int v) {
        this.v = v;
    }
  }

  public static void main(String[] args) {
    BO a = new BO(1);
    BO b = new BO(2);
    BO c = new BO(3);
    BO[] arr = {a, b, c};
    BO t = arr[0];
    arr[0] = arr[2];
    arr[2] = t;
    arr[1].v = arr[0].v;
    System.out.println(a.v + "a" + b.v + "b" + c.v);
  }
}
// 답: 3a3b1
// 결과: X
