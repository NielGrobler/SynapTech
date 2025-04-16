logout = async () => {
    try {
      const response = await axios("/users/logout", { method: "POST"});
  
      // remove token from local storage and redirect to login page 
      localStorage.setItem('token', null);
      this.props.history.push("/login");
    } catch (e) {
      console.log(error);
    }
  }