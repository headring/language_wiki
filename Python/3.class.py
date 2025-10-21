# 클래스 생성
class Amazon:
  strength = 20
  dexterity = 25
  vitality = 20
  energy = 15

  def attack(self):
    return 'Jab!!!'
  
  # 자신의 속성에 접근하려면 self라는 키워드 활용
  def exercise(self):
    self.strength += 2
    self.dexterity += 3
    self.vitality += 1

# 상속
class NortAmazon(Amazon):
  def place(self):
    print('placed in north')
    return 'placed in north'
  
test = NortAmazon()
test.place()