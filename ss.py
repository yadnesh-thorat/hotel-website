tablel, tableq, namel, nameq, idl, idq = {}, {}, {}, {}, {}, {}

print("Name: Palak Wase ")
print("Roll no.: 72")

def create(size):
    for i in range(size):
        tablel[i] = None
        tableq[i] = None
        namel[i] = None
        nameq[i] = None
        idl[i] = None
        idq[i] = None

def linsert(key, name, phone, size):
    hash = key % size
    flag = 0

    if tablel[hash] is None:
        tablel[hash] = key
        namel[hash] = name
        idl[hash] = phone
    else:
        for i in range(size):
            hash = (key + i) % size
            if tablel[hash] is None:
                tablel[hash] = key
                namel[hash] = name
                idl[hash] = phone
                flag = 1
                break

    if flag == 0:
        print("Table is full")

def lsearch(key, size):
    hash = key % size
    count = 0
    flag = 0

    if tablel[hash] == key:
        print(f"ID: {key} is present at location: {hash}")
        print(f"Name: {namel[hash]}")
        print(f"Phone Number: {idl[hash]}")
        print(f"Number of comparisons required: {count}")
    else:
        for i in range(size):
            hash = (key + i) % size
            count += 1
            if tablel[hash] == key:
                print(f"ID: {key} is present at location: {hash}")
                print(f"Name: {namel[hash]}")
                print(f"Phone Number: {idl[hash]}")
                print(f"Number of comparisons required: {count}")
                flag = 1
                break
            elif tablel[hash] is None:
                print(f"ID: {key} is not present")
                flag = 1
                break

        if flag == 0:
            print(f"ID: {key} is not present")

def printl(size):
    print("Printing linear probing table:")
    for i in range(size):
        print(tablel[i], "|", namel[i], "|", idl[i], "|")
    print("")

def qinsert(key, name, phone, size):
    hash = key % size
    flag = 0

    if tableq[hash] is None:
        tableq[hash] = key
        nameq[hash] = name
        idq[hash] = phone
    else:
        for i in range(size):
            hash = (key + (i * i)) % size
            if tableq[hash] is None:
                tableq[hash] = key
                nameq[hash] = name
                idq[hash] = phone
                flag = 1
                break

    if flag == 0:
        print("Table is full")

def qsearch(key, size):
    hash = key % size
    count = 0
    flag = 0

    if tableq[hash] == key:
        print(f"ID: {key} is present at location: {hash}")
        print(f"Name: {nameq[hash]}")
        print(f"Phone Number: {idq[hash]}")
        print(f"Number of comparisons required: {count}")
    else:
        for i in range(size):
            hash = (key + (i * i)) % size
            count += 1
            if tableq[hash] == key:
                print(f"ID: {key} is present at location: {hash}")
                print(f"Name: {nameq[hash]}")
                print(f"Phone Number: {idq[hash]}")
                print(f"Number of comparisons required: {count}")
                flag = 1
                break
            elif tableq[hash] is None:
                print(f"ID: {key} is not present")
                flag = 1
                break

        if flag == 0:
            print(f"ID: {key} is not present")

def printq(size):
    print("Printing quadratic probing table:")
    for i in range(size):
        print(tableq[i], "|", nameq[i], "|", idq[i], "|")
    print("")

n = int(input("Enter table size: "))
create(n)

while True:
    print("| 1. Linear Probing | 2. Quadratic Probing | 3. Exit |")
    ch = int(input("Enter your choice: "))

    if ch == 1:
        while True:
            print("| 1. Insert (Linear) | 2. Search (Linear) | 3. Go Back |")
            ch1 = int(input("Enter your choice: "))

            if ch1 == 1:
                k = int(input("Enter the ID of the person: "))
                nm = input("Enter User name: ")
                ph = input("Enter phone number: ")
                linsert(k, nm, ph, n)
                printl(n)

            elif ch1 == 2:
                k1 = int(input("Enter the ID of the person: "))
                lsearch(k1, n)
                printl(n)

            else:
                break

    elif ch == 2:
        while True:
            print("| 1. Insert (Quadratic) | 2. Search (Quadratic) | 3. Go Back |")
            ch1 = int(input("Enter your choice: "))

            if ch1 == 1:
                k = int(input("Enter the ID of the person: "))
                nm = input("Enter User name: ")
                ph = input("Enter phone number: ")
                qinsert(k, nm, ph, n)
                printq(n)

            elif ch1 == 2:
                k1 = int(input("Enter the ID of the person: "))
                qsearch(k1, n)
                printq(n)

            else:
                break

    elif ch == 3:
        print("Exiting program...")
        break

    else:
        print("Invalid choice. Please try again.")


