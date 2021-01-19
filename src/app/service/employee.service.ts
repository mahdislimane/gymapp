import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable()
export class EmployeeService {
  constructor(protected http: HttpClient) {}
  configuration = {
    headers: {
      'x-auth-token': localStorage.getItem('x-auth-token'),
    },
  };

  getEmployees() {
    return this.http.get(environment.URL + 'api/employee', this.configuration);
  }

  getSelectedEmployee(id) {
    return this.http.get(
      environment.URL + 'api/employee/' + id,
      this.configuration
    );
  }

  addEmployee(employee) {
    return this.http.post(
      environment.URL + 'api/employee',
      employee,
      this.configuration
    );
  }

  deleteEmployee(id) {
    return this.http.delete(
      environment.URL + 'api/employee/' + id,
      this.configuration
    );
  }
  editEmployee(id, employee) {
    return this.http.put(
      environment.URL + 'api/employee/' + id,
      employee,
      this.configuration
    );
  }

  addSalary(id, salary) {
    return this.http.put(
      environment.URL + 'api/employee/' + id + '/salary',
      salary,
      this.configuration
    );
  }

  editDayoff(id, data, ida) {
    console.log(environment.URL + 'api/employee/' + id + '/dayoff/' + ida);
    console.log(data);
    return this.http.put(
      environment.URL + 'api/employee/' + id + '/dayoff/' + ida,
      data,
      this.configuration
    );
  }

  deleteSalary(id, idSalary) {
    return this.http.delete(
      environment.URL + 'api/employee/' + id + '/salary/' + idSalary,
      this.configuration
    );
  }

  addAvance(id, avance) {
    return this.http.put(
      environment.URL + 'api/employee/' + id + '/avance',
      avance,
      this.configuration
    );
  }

  deleteAvance(id, idAvance) {
    return this.http.delete(
      environment.URL + 'api/employee/' + id + '/avance/' + idAvance,
      this.configuration
    );
  }

  addEnterExit(card) {
    return this.http.put(
      environment.URL + 'api/employee/enterexit/' + card,
      {},
      this.configuration
    );
  }
}
